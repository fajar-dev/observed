const numericUtility = /\b(?:p[xysetblr]?|m[xysetblr]?|size|h|w|min-h|min-w|max-h|max-w|gap(?:-[xy])?|space-[xy]|grid-cols|col-span|line-clamp|z|opacity|leading|outline|ring|flex|shrink|grow|top|bottom|left|right|inset(?:-[xy])?|text)-(?:\d+(?:\.\d+)?(?:xl)?|\[[^\]\n]*\d[^\]\n]*\])/g

export default {
  rules: {
    'semantic-sizes': {
      meta: { type: 'suggestion', schema: [], messages: { semantic: 'Use a semantic design token or the Nuxt UI size prop instead of "{{ utility }}".' } },
      create(context) {
        return {
          'Program:exit'() {
            const source = context.sourceCode
            for (const match of source.text.matchAll(numericUtility)) {
              context.report({ loc: { start: source.getLocFromIndex(match.index), end: source.getLocFromIndex(match.index + match[0].length) }, messageId: 'semantic', data: { utility: match[0] } })
            }
          }
        }
      }
    }
  }
}
