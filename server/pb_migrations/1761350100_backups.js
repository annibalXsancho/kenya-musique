/// <reference path="../pb_data/types.d.ts" />
// S4 : sauvegarde nocturne intégrée à PocketBase (zip de pb_data, 14 conservées).
// La copie hors serveur est récupérée depuis le Mac par scripts/backup-pull.mjs.
migrate(
  (app) => {
    const settings = app.settings();
    settings.backups.cron = '0 3 * * *';
    settings.backups.cronMaxKeep = 14;
    app.save(settings);
  },
  (app) => {
    const settings = app.settings();
    settings.backups.cron = '';
    app.save(settings);
  },
);
