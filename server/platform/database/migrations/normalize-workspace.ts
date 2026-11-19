import type { PoolClient } from 'pg'
import { workspaceSchema } from '../workspace-schema'

/** A one-time conversion. Runtime repositories only read the relational schema. */
export async function normalizeWorkspace(client: PoolClient) {
  const legacy = await client.query('SELECT 1 FROM information_schema.columns WHERE table_schema=\'observe\' AND table_name=\'data_sources\' AND column_name=\'document\'')
  const tables = ['dashboard_versions', 'dashboards', 'alert_rules', 'dashboard_folders', 'data_sources', 'telegram_destinations']
  if (!legacy.rowCount) {
    await client.query(workspaceSchema)
    return
  }
  for (const table of tables) await client.query(`ALTER TABLE observe.${table} RENAME TO ${table}_documents`)
  await client.query(workspaceSchema)
  await client.query(`
    INSERT INTO observe.data_sources(id,name,url,query_language,organization,database_name,username,credential_ciphertext,updated_at)
    SELECT id,document->>'name',document->>'url',document->>'queryLanguage',COALESCE(document->>'organization',''),document->>'database',COALESCE(document->>'username',''),document->>'ciphertext',updated_at FROM observe.data_sources_documents;
    INSERT INTO observe.telegram_destinations(id,name,chat_id,bot_token_ciphertext,updated_at)
    SELECT id,document->>'name',document->>'chatId',document->>'ciphertext',updated_at FROM observe.telegram_destinations_documents;
    INSERT INTO observe.dashboard_folders(id,name,updated_at)
    SELECT id,document->>'name',updated_at FROM observe.dashboard_folders_documents;
    INSERT INTO observe.dashboard_folders(id,name)
    SELECT gen_random_uuid(),folder FROM (
      SELECT DISTINCT document->>'folder' AS folder FROM observe.dashboards_documents
      UNION SELECT DISTINCT document->>'folder' FROM observe.alert_rules_documents
    ) names WHERE folder IS NOT NULL AND folder<>'' AND NOT EXISTS(SELECT 1 FROM observe.dashboard_folders WHERE lower(name)=lower(folder))
    ON CONFLICT DO NOTHING;
    INSERT INTO observe.dashboards(id,name,description,folder_name,tags,revision,definition,updated_at)
    SELECT id,document->>'name',COALESCE(document->>'description',''),
      (SELECT name FROM observe.dashboard_folders WHERE lower(name)=lower(document->>'folder')),
      COALESCE(document->'tags','[]'),COALESCE((document->>'revision')::integer,1),
      document-ARRAY['name','description','folder','tags','revision','id','updatedAt'],updated_at
    FROM observe.dashboards_documents;
    INSERT INTO observe.dashboard_versions(id,dashboard_id,snapshot,updated_at)
    SELECT id,(document->>'dashboardId')::uuid,document->'snapshot',updated_at FROM observe.dashboard_versions_documents;
    INSERT INTO observe.alert_rules(id,name,data_source_id,folder_name,enabled,evaluation_interval,configuration,runtime,updated_at)
    SELECT id,document->>'name',(document->>'dataSourceId')::uuid,
      (SELECT name FROM observe.dashboard_folders WHERE lower(name)=lower(document->>'folder')),
      (document->>'enabled')::boolean,(document->>'interval')::integer,
      document-ARRAY['id','updatedAt','name','dataSourceId','folder','enabled','interval','evaluation','evaluationHistory','pendingSince','notifiedDestinations'],
      jsonb_strip_nulls(jsonb_build_object('evaluation',document->'evaluation','evaluationHistory',document->'evaluationHistory','pendingSince',document->'pendingSince','notifiedDestinations',document->'notifiedDestinations')),updated_at
    FROM observe.alert_rules_documents;
    INSERT INTO observe.dashboard_data_sources(dashboard_id,data_source_id)
    SELECT DISTINCT d.id,s.id FROM observe.dashboards d
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(d.definition->'panels','[]') || COALESCE(d.definition->'variables','[]')) item
    JOIN observe.data_sources s ON s.id::text=item->>'dataSourceId';
    INSERT INTO observe.alert_rule_destinations(alert_rule_id,telegram_destination_id)
    SELECT a.id,d.id FROM observe.alert_rules a
    CROSS JOIN LATERAL jsonb_array_elements_text(a.configuration->'telegramDestinationIds') target
    JOIN observe.telegram_destinations d ON d.id::text=target;
  `)
  for (const table of tables) await client.query(`DROP TABLE observe.${table}_documents CASCADE`)
}
