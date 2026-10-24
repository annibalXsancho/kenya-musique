/// <reference path="../pb_data/types.d.ts" />
// S3 : collections de synchronisation (CLAUDE.md §7, §8).
// Choix : chaque collection stocke le document complet dans `data` (JSON), plus `updatedAt` et
// `deleted` en colonnes. Un seul modèle (Zod, côté client) ; le serveur ne le duplique pas.
// Le curseur de synchro est `updated` (horloge du serveur), le conflit se règle sur `updatedAt` client.

const COLLECTIONS = [
  'vision',
  'objectifs',
  'krs',
  'phases',
  'sprints',
  'etapes',
  'creneaux',
  'sessions',
  'indisponibilites',
  'reglages',
];

migrate(
  (app) => {
    // Compte unique : plus d'inscription publique, seul le superuser crée l'utilisateur.
    const users = app.findCollectionByNameOrId('users');
    users.createRule = null;
    users.listRule = 'id = @request.auth.id';
    users.viewRule = 'id = @request.auth.id';
    users.updateRule = 'id = @request.auth.id';
    users.deleteRule = null;
    users.authToken.duration = 2592000; // session persistante : 30 jours, renouvelée à chaque ouverture
    app.save(users);

    const owner = {
      type: 'relation',
      name: 'owner',
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    };
    const rules = {
      listRule: 'owner = @request.auth.id',
      viewRule: 'owner = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.body.owner = @request.auth.id',
      updateRule: 'owner = @request.auth.id',
      deleteRule: null, // jamais de suppression définitive (§8)
    };
    const stamps = [
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ];

    for (const name of COLLECTIONS) {
      app.save(
        new Collection({
          type: 'base',
          name,
          ...rules,
          fields: [
            owner,
            { type: 'text', name: 'updatedAt', required: true },
            { type: 'bool', name: 'deleted' },
            { type: 'json', name: 'data', maxSize: 2000000 },
            ...stamps,
          ],
          indexes: [`CREATE INDEX idx_${name}_updated ON ${name} (updated)`],
        }),
      );
    }

    // Fichiers des livrables : l'id est choisi par le client, donc stable même hors ligne.
    app.save(
      new Collection({
        type: 'base',
        name: 'fichiers',
        ...rules,
        fields: [
          owner,
          {
            type: 'file',
            name: 'file',
            required: true,
            maxSelect: 1,
            maxSize: 52428800, // 50 Mo
            protected: true,
          },
          ...stamps,
        ],
      }),
    );
  },
  (app) => {
    for (const name of [...COLLECTIONS, 'fichiers']) {
      app.delete(app.findCollectionByNameOrId(name));
    }
  },
);
