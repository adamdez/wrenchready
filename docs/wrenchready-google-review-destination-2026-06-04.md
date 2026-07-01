# WrenchReady Google Review Destination

Checked: 2026-07-01

## Verified Destination

```text
https://www.google.com/maps/place//data=!4m3!3m2!1s0xa91da132a44e7325:0x5931ba3271921a7d!12e1?g_mp=CiVnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLkdldFBsYWNlEAIYBCAA
```

## Evidence

Read-only Google profile/API verification of the Google profile for `WrenchReady Mobile` showed:

- Google profile query: `https://www.google.com/search?kgmid=/g/11nblfp_kv&q=WrenchReady+Mobile`
- Profile name: `WrenchReady Mobile`
- Public phone: `(509) 309-0617`
- Website: `https://wrenchreadymobile.com/`
- Review count: `13 Google reviews`
- Maps profile CID: `0x5931ba3271921a7d`
- Decimal `ludocid`: `6427122869050940029`
- Place ID: `ChIJJXNOpDKhHakRfRqScTK6MVk`
- Google Places API `googleMapsLinks.writeAReviewUri` returned the verified destination above.
- The previous `#lrd=0xa91da132a44e7325:0x5931ba3271921a7d,3,,,,` Google Search URL worked on desktop but did not reliably open the star/comment review form on iPhone or Android.

## Use

Use this URL for review-request drafts and for `WR_GOOGLE_REVIEW_URL` / `NEXT_PUBLIC_WR_GOOGLE_REVIEW_URL` configuration.

The app also normalizes stale WrenchReady `#lrd` review URLs to this write-review URI so old environment variables do not silently override the mobile-safe destination.

## Guardrails

- This verification did not send a review request.
- This verification did not post a review.
- This verification did not change production environment variables.
- Customer review asks still require Adam's approval of the exact target/content unless a future approved automation explicitly covers them.
