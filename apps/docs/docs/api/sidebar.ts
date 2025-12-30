import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/scrape-dojo-api",
    },
    {
      type: "category",
      label: "scrapes",
      items: [
        {
          type: "doc",
          id: "api/scrape-controller-stop-scrape",
          label: "Stop running scrape",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/scrape-controller-scrape",
          label: "Start scraping",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "secrets",
      items: [
        {
          type: "doc",
          id: "api/secrets-controller-list-secrets",
          label: "List all secrets (without actual values)",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/secrets-controller-create-secret",
          label: "Create a new secret",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/secrets-controller-get-secret",
          label: "Get a secret by ID (without actual value)",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/secrets-controller-update-secret",
          label: "Update a secret",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/secrets-controller-delete-secret",
          label: "Delete a secret",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/secrets-controller-link-to-workflow",
          label: "Link a secret to a workflow",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/secrets-controller-unlink-from-workflow",
          label: "Unlink a secret from a workflow",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Variables",
      items: [
        {
          type: "doc",
          id: "api/variables-controller-get-all",
          label: "VariablesController_getAll",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/variables-controller-create",
          label: "VariablesController_create",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/variables-controller-get-global",
          label: "VariablesController_getGlobal",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/variables-controller-get-workflow-definitions",
          label: "VariablesController_getWorkflowDefinitions",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/variables-controller-get-by-workflow",
          label: "VariablesController_getByWorkflow",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/variables-controller-get-by-id",
          label: "VariablesController_getById",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/variables-controller-update",
          label: "VariablesController_update",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/variables-controller-delete",
          label: "VariablesController_delete",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "ScrapeUI",
      items: [
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-scrapes",
          label: "ScrapeUIController_getScrapes",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-scrape-by-id",
          label: "ScrapeUIController_getScrapeById",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-run-scrape",
          label: "ScrapeUIController_runScrape",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-events",
          label: "ScrapeUIController_events",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-events-status",
          label: "ScrapeUIController_getEventsStatus",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-ping-events",
          label: "ScrapeUIController_pingEvents",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-logs",
          label: "ScrapeUIController_getLogs",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-clear-logs",
          label: "ScrapeUIController_clearLogs",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-submit-otp",
          label: "ScrapeUIController_submitOtp",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-runs",
          label: "ScrapeUIController_getRuns",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-run-by-id",
          label: "ScrapeUIController_getRunById",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-delete-run",
          label: "ScrapeUIController_deleteRun",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-delete-runs-by-scrape-id",
          label: "ScrapeUIController_deleteRunsByScrapeId",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-cleanup-runs",
          label: "ScrapeUIController_cleanupRuns",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-scrape-data",
          label: "ScrapeUIController_getScrapeData",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-run-data",
          label: "ScrapeUIController_getRunData",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-all-scrape-data",
          label: "ScrapeUIController_getAllScrapeData",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-schedule",
          label: "ScrapeUIController_getSchedule",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-update-schedule",
          label: "ScrapeUIController_updateSchedule",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-all-schedules",
          label: "ScrapeUIController_getAllSchedules",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/scrape-ui-controller-get-scheduler-status",
          label: "ScrapeUIController_getSchedulerStatus",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Actions",
      items: [
        {
          type: "doc",
          id: "api/actions-controller-get-actions-metadata",
          label: "ActionsController_getActionsMetadata",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Health",
      items: [
        {
          type: "doc",
          id: "api/health-controller-check",
          label: "HealthController_check",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/health-controller-liveness",
          label: "HealthController_liveness",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/health-controller-readiness",
          label: "HealthController_readiness",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
