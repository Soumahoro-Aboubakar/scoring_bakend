# Architecture d'automatisation football

## Objectif

Le backend automatise maintenant le cycle suivant:

1. Collecte des matchs par date depuis BBC Sport.
2. Complément web via provider IA si la collecte BBC est insuffisante.
3. Enregistrement MongoDB en statut `collected`.
4. Analyse IA avancée en JSON strict.
5. Sauvegarde des prédictions selon le modèle `Match`.
6. Validation post-match via modèle IA web à coût réduit.
7. Nettoyage des données collectées non analysées après 48h.

## Configuration `.env`

Copier `config/env.example` vers `.env`, puis ajuster:

- `AI_PROVIDER`: provider par défaut (`OPENAI`, `GEMINI`).
- `COLLECTION_AI_PROVIDER`, `ANALYSIS_AI_PROVIDER`, `VALIDATION_AI_PROVIDER`: provider par étape.
- `COLLECTION_MODEL`, `ANALYSIS_MODEL`, `VALIDATION_MODEL`: modèle par étape.
- `CRON_JOBS_ENABLED`: active/désactive tous les cron jobs.
- `COLLECT_ENABLED`, `ANALYSIS_ENABLED`, `VALIDATION_ENABLED`, `CLEANUP_ENABLED`: active/désactive chaque tâche.
- `COLLECT_CRON`: planification collecte. Par défaut tous les jours à 10h et 18h (`0 10,18 * * *`).
- `COLLECT_TARGET_OFFSET_DAYS=1`: à partir de la date serveur X, collecte X+1.
- `VALIDATION_TARGET_OFFSET_DAYS=-1`: valide X-1.
- `COLLECTED_TEMP_TTL_HOURS=48`: durée max des données collectées non analysées.
- `ANALYSIS_CRITERIA`: critères métier modifiables sans changer le code.

## Modèle MongoDB

`Match` contient maintenant:

- `automation.pipelineStatus`: `manual`, `collected`, `analyzed`, `validated`, `failed`.
- `automation.collectionStatus`, `analysisStatus`, `validationStatus`.
- `automation.source`: provider/source/url/externalId/dates.
- `automation.modelTrace`: provider + modèle utilisés par étape.
- `automation.expireAt`: TTL MongoDB pour supprimer les matchs temporaires non analysés.
- `validation`: résultat de validation, exact score, partiel, confiance.

La collection `AutomationRun` journalise chaque run: type, statut, métriques, logs, erreurs.

## Cron jobs

Le scheduler est initialisé dans `server.js`.

- Collecte: `COLLECT_CRON`.
- Analyse: `ANALYSIS_CRON`.
- Validation: `VALIDATION_CRON`.
- Nettoyage: `CLEANUP_CRON`.

Un verrou mémoire empêche deux exécutions simultanées du même job dans un même processus. En production multi-instance, remplacer ce verrou par BullMQ + Redis lock.

## Routes admin

Toutes les routes demandent un admin JWT:

- `GET /api/automation/config`
- `GET /api/automation/runs`
- `GET /api/automation/stats`
- `POST /api/automation/collect` avec `{ "targetDate": "2026-05-21" }`
- `POST /api/automation/analyze`
- `POST /api/automation/validate`
- `POST /api/automation/cleanup`
- `POST /api/automation/pipeline`

## Providers IA

Le code métier utilise `completeJsonWithProvider()`.

- `OPENAI`: Responses API, JSON schema strict, outil web search si activé.
- `GEMINI`: Generate Content API, JSON mime type, Google Search grounding si activé.

Pour ajouter un provider:

1. Créer `services/ai/providers/<provider>Provider.js`.
2. Implémenter `completeJson({ model, system, prompt, schema, webSearch })`.
3. L'enregistrer dans `services/ai/providerFactory.js`.

## Validation JSON

Les sorties IA passent par:

- JSON Schema côté provider si disponible.
- `parseJsonObject()` pour retirer les fences markdown.
- Validation stricte Zod dans `services/automation/schemas.js`.

Une sortie incohérente déclenche retry, puis statut `failed` avec log.

## Migration production recommandée

1. Ajouter les variables `.env`.
2. Déployer le backend.
3. Laisser MongoDB créer les indexes au démarrage.
4. Tester manuellement `POST /api/automation/pipeline` sur une date.
5. Vérifier `/api/automation/runs`.
6. Activer `CRON_JOBS_ENABLED=true`.
7. Sur fort volume, externaliser les jobs vers BullMQ/Redis et limiter l'analyse IA par batch.

## Monitoring

Surveiller:

- Nombre de `AutomationRun.status=failed`.
- Matchs bloqués en `analysisStatus=failed`.
- Coût IA par provider/modèle via `automation.modelTrace`.
- Ratio `inserted/updated/skipped`.
- Taux `validation.exactScoreCorrect` et `validation.partialCorrect`.
