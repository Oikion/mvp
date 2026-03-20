# Portal Publishing

## Directory structure

```
docs/portal-publishing/
├─ index.md
└─ xe-gr.md
```

## Versioning details

- xe.gr Bulk Import Tool (BIT) API: Property v1.4.1
- Oikion integration: internal API route `POST /api/portal-publishing/xe-gr`

## Key usage notes

- Configure the xe.gr credentials in environment variables before publishing.
- The integration forwards a ZIP package that contains the Unified Ad Format XML and its related assets.
- Use action `add` to publish and `remove` to delete on xe.gr.
- See `docs/portal-publishing/xe-gr.md` for the full workflow.
