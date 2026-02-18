# API Reference

Base URL: `http://localhost:3021/api` | Swagger: `http://localhost:3021/api/docs`

## Datasets

| Method | Path                              | Description                 |
| ------ | --------------------------------- | --------------------------- |
| GET    | `/datasets`                       | List datasets               |
| GET    | `/datasets/:id`                   | Get dataset with test cases |
| PUT    | `/datasets/:id`                   | Update dataset on disk      |
| POST   | `/datasets/reload`                | Re-read CSV files from disk |
| POST   | `/datasets/import`                | Upload CSV                  |
| GET    | `/datasets/:id/export/{json,csv}` | Export dataset              |

## Graders

| Method | Path              | Description                  |
| ------ | ----------------- | ---------------------------- |
| GET    | `/graders`        | List graders                 |
| GET    | `/graders/:id`    | Get grader                   |
| POST   | `/graders`        | Create grader                |
| PUT    | `/graders/:id`    | Update grader (writes YAML)  |
| DELETE | `/graders/:id`    | Delete grader                |
| POST   | `/graders/reload` | Re-read YAML files from disk |

## Prompts (Candidates)

| Method | Path                             | Description            |
| ------ | -------------------------------- | ---------------------- |
| GET    | `/prompts`                       | List prompts           |
| GET    | `/prompts/:id`                   | Get prompt             |
| PUT    | `/prompts/:id`                   | Update prompt on disk  |
| POST   | `/prompts/:id/test`              | Test with sample input |
| POST   | `/prompts/:id/variant`           | Create variant         |
| POST   | `/prompts/:id/variants/generate` | AI-generate variants   |
| DELETE | `/prompts/:id`                   | Delete prompt          |
| POST   | `/prompts/reload`                | Re-read .md from disk  |

## Experiments

| Method | Path                                               | Description               |
| ------ | -------------------------------------------------- | ------------------------- |
| GET    | `/experiments`                                     | List experiments          |
| POST   | `/experiments`                                     | Create and run experiment |
| GET    | `/experiments/:id`                                 | Get with results          |
| GET    | `/experiments/:id/stats`                           | Aggregate statistics      |
| GET    | `/experiments/:id/stream`                          | SSE progress stream       |
| GET    | `/experiments/:id/compare?baseline=X&challenger=Y` | A/B compare               |
| DELETE | `/experiments/:id`                                 | Delete experiment         |
| GET    | `/experiments/:id/export/{json,csv}`               | Export results            |
| GET    | `/experiments/export/all-csv`                      | Export all as CSV         |
| DELETE | `/experiments/clear-all`                           | Delete all experiments    |

## Presets

| Method | Path                          | Description          |
| ------ | ----------------------------- | -------------------- |
| GET    | `/presets/graders`            | List grader presets  |
| POST   | `/presets/graders/:id/load`   | Load a grader preset |
| POST   | `/presets/seed`               | Load all presets     |
| POST   | `/presets/synthetic/generate` | Generate test cases  |
| POST   | `/presets/synthetic/dataset`  | Generate + save CSV  |

## Settings

| Method | Path                 | Description         |
| ------ | -------------------- | ------------------- |
| GET    | `/settings/llm`      | Get LLM config      |
| PUT    | `/settings/llm`      | Update LLM config   |
| POST   | `/settings/llm/test` | Test LLM connection |
| POST   | `/settings/reset`    | Reset to defaults   |
