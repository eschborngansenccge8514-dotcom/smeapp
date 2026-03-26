<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# What is the best way to implement multiple languages in application that build on react native next.js and supabase

The best approach is to use **i18next** as the shared translation engine across both React Native and Next.js, with Supabase handling language preferences and multilingual content storage. This unified stack avoids duplicating logic and keeps translations consistent.

## Core Library: i18next Ecosystem

`i18next` works seamlessly across both React Native and Next.js since they share the same JavaScript runtime. Install the core packages in both apps:[^1]

```bash
npm install i18next react-i18next
```

- **React Native**: Add `expo-localization` to auto-detect the device locale[^2]
- **Next.js**: Use `next-i18next` or `next-intl`, which integrates with Next.js's built-in i18n routing[^3]
- **Shared translations**: Keep your JSON translation files in a shared monorepo folder (e.g., `/locales/en.json`, `/locales/ms.json`) so both apps pull from the same source


## React Native Setup

Use `expo-localization` to detect the device language automatically and fall back to a default. Configure `i18next` once in a dedicated file and consume it via the `useTranslation()` hook anywhere in the app:[^2]

```js
// i18n.js
import i18n from 'i18next';
import * as Localization from 'expo-localization';

i18n.init({
  lng: Localization.getLocales()[^0].languageCode || 'en',
  fallbackLng: 'en',
  resources: { en: { translation: require('./locales/en.json') } }
});
```

Always use `useTranslation()` (not direct `i18n.t()`) in components, because the hook triggers re-renders when the language changes.[^2]

## Next.js Setup

Next.js has **built-in internationalized routing** — you simply declare supported locales in `next.config.js`:[^4]

```js
module.exports = {
  i18n: {
    locales: ['en', 'ms', 'zh'],
    defaultLocale: 'en',
  }
}
```

This automatically generates locale-prefixed routes like `/ms/about` or `/zh/about`, which is critical for SEO. Pair this with `next-i18next` to load translation JSON files server-side via `getStaticProps` or `getServerSideProps`.[^3]

## Supabase Integration

Supabase plays two roles in a multilingual app:

- **User language preference**: Store the user's preferred locale in the `profiles` table (e.g., a `locale` column). Read it on login and call `i18n.changeLanguage()` to sync the UI[^5]
- **Multilingual content**: For user-generated or dynamic content, store translations per row using a JSONB column (e.g., `{ "en": "Hello", "ms": "Helo" }`) or separate locale-keyed rows
- **Supabase Auth emails**: Customize transactional emails (confirm, reset) per language using the Email Templates in the Supabase dashboard[^5]
- **AI-powered translation**: For auto-translating user-generated content at scale, you can use a Postgres trigger + HTTP extension to call a translation API directly from Supabase without extra server code[^6]


## Architecture Best Practices

| Concern | Recommendation |
| :-- | :-- |
| Translation files | Shared `/locales` folder in a monorepo [^7] |
| Translation keys | Use semantic keys like `action.confirm`, not `button.ok` [^7] |
| Language detection | Device locale (RN) + URL prefix (Next.js) + DB preference (Supabase) |
| Dynamic content | JSONB in Supabase or API-driven i18n [^8] |
| Text length overflow | Use `numberOfLines` in RN; test all languages regularly [^7] |
| SEO (Next.js) | Add `hreflang` tags for each locale version [^3] |

The key insight is to **separate static UI strings** (managed in JSON files via i18next) from **dynamic database content** (managed in Supabase). This two-layer approach scales well as you add more languages without needing to rebuild your app.

What languages are you planning to support — is this primarily for a Malaysian audience (English/Malay/Chinese), or a broader international audience?
<span style="display:none">[^10][^11][^12][^13][^14][^15][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.reddit.com/r/reactnative/comments/1c9cz3y/how_to_implement_more_than_one_languages_in_rn_app/

[^2]: https://dev.to/luizrebelatto/i18n-internationalization-in-react-native-2k42

[^3]: https://leapcell.io/blog/best-practices-for-internationalization-in-next-js-and-nuxt-js

[^4]: https://nextjs.org/docs/pages/guides/internationalization

[^5]: https://supabase.com/docs/guides/troubleshooting/customizing-emails-by-language-KZ_38Q

[^6]: https://www.youtube.com/watch?v=loOJxuwgn2g

[^7]: https://addjam.com/blog/2025-02-27/implementing-internationalisation-react-native/

[^8]: https://reverieinc.com/blog/react-native-i18n-internationalisation-mobile-apps/

[^9]: https://linguidoor.com/react-native-localization-made-easy-in-2025/

[^10]: https://www.linkedin.com/pulse/best-practices-implementing-i18n-react-native-ekrem-güneş-puwnf

[^11]: https://www.glorywebs.com/blog/internationalization-in-react

[^12]: https://stackoverflow.com/questions/74325233/how-to-make-react-app-that-support-multilanguage

[^13]: https://crowdin.com/blog/react-i18n

[^14]: https://www.reddit.com/r/nextjs/comments/1p3s866/nexti18next_and_good_practices_what_you_are/

[^15]: https://github.com/orgs/supabase/discussions/41896

