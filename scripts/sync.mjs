name: Sinkronisasi data dosen
on:
  schedule: [{cron: '0 2 1 * *'}]   # tanggal 1 tiap bulan, 02:00 UTC
  workflow_dispatch:
  push:
    paths: ['materi/**','scripts/build-materi.mjs']
permissions: {contents: write}
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: 20}
      - run: node scripts/build-materi.mjs
      - run: node scripts/sync.mjs
        env: {SERPAPI_API_KEY: '${{ secrets.SERPAPI_API_KEY }}'}
        continue-on-error: true   # data lama tetap aman bila salah satu sumber gagal
      - run: |
          git config user.name "sync-bot"; git config user.email "bot@users.noreply.github.com"
          git add data
          git diff --cached --quiet || (git commit -m "chore: sinkronisasi data $(date +%F)" && git push)
