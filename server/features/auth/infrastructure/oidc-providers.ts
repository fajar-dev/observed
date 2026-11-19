import type { OAuthFlow } from '../domain/authentication.ports'
import * as oidc from 'openid-client'
import { z } from 'zod'
import type { AuthProvider } from '#shared/domain/auth'
import { WorkspaceError } from '~~/server/domain/workspace-error'

type ProviderSettings = { issuer: URL, clientId: string, secret: string }

export class OidcProviders {
  private readonly configurations = new Map<AuthProvider, Promise<oidc.Configuration>>()
  constructor(private readonly environment: NodeJS.ProcessEnv, private readonly fetcher?: NonNullable<oidc.DiscoveryRequestOptions[typeof oidc.customFetch]>) {}

  enabled(): AuthProvider[] {
    return (['google', 'microsoft'] as const).filter(provider => this.environment['OBSERVE_' + provider.toUpperCase() + '_ENABLED'] === 'true')
  }

  private settings(provider: AuthProvider): ProviderSettings {
    if (!this.enabled().includes(provider)) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Sign-in provider is disabled' })
    const prefix = 'OBSERVE_' + provider.toUpperCase()
    const clientId = this.environment[prefix + '_CLIENT_ID']
    const secret = this.environment[prefix + '_CLIENT_SECRET']
    const tenant = this.environment.OBSERVE_MICROSOFT_TENANT_ID
    if (!clientId || !secret || (provider === 'microsoft' && !z.uuid().safeParse(tenant).success)) {
      throw new WorkspaceError({ statusCode: 503, statusMessage: 'Complete the sign-in provider environment configuration' })
    }
    return { clientId, secret, issuer: new URL(provider === 'google' ? 'https://accounts.google.com' : `https://login.microsoftonline.com/${tenant}/v2.0`) }
  }

  private configuration(provider: AuthProvider) {
    const settings = this.settings(provider)
    let config = this.configurations.get(provider)
    if (!config) {
      config = oidc.discovery(settings.issuer, settings.clientId, settings.secret, undefined, { [oidc.customFetch]: this.fetcher, timeout: 15, execute: [oidc.enableNonRepudiationChecks] }).catch((error) => {
        this.configurations.delete(provider)
        throw error
      })
      this.configurations.set(provider, config)
    }
    return config
  }

  async start(provider: AuthProvider, callback: string, link?: { userId: string, sessionId: string }) {
    const config = await this.configuration(provider)
    const flow: OAuthFlow = {
      provider, verifier: oidc.randomPKCECodeVerifier(), state: oidc.randomState(), nonce: oidc.randomNonce(), expiresAt: Date.now() + 600_000,
      linkUserId: link?.userId, linkSessionId: link?.sessionId
    }
    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callback, scope: 'openid profile email', response_type: 'code',
      code_challenge: await oidc.calculatePKCECodeChallenge(flow.verifier), code_challenge_method: 'S256', state: flow.state, nonce: flow.nonce
    })
    return { flow, url: url.href }
  }

  async finish(provider: AuthProvider, currentUrl: URL, flow: OAuthFlow, callback: string) {
    if (flow.provider !== provider || flow.expiresAt < Date.now()) throw new Error('Sign-in request has expired')
    const config = await this.configuration(provider)
    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, { pkceCodeVerifier: flow.verifier, expectedState: flow.state, expectedNonce: flow.nonce, idTokenExpected: true }, { redirect_uri: callback })
    const claims = tokens.claims()
    if (!claims?.sub) throw new Error('Missing identity')
    const email = z.email().safeParse(claims.email)
    if (!email.success || (provider === 'google' && claims.email_verified !== true)) throw new Error('The identity provider must supply a verified email address')
    // Microsoft is restricted to one explicitly configured tenant; identities never link by email.
    if (provider === 'microsoft' && claims.tid !== this.environment.OBSERVE_MICROSOFT_TENANT_ID) throw new Error('Invalid Microsoft tenant')
    const name = typeof claims.name === 'string' ? claims.name.slice(0, 100) : email.data
    return { subject: claims.sub, email: email.data.toLowerCase(), name }
  }
}
