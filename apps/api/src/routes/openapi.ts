import { Hono } from "hono";
import type { Env, Variables } from "../env.js";

const jsonResponse = {
  content: {
    "application/json": {
      schema: { type: "object" },
    },
  },
  description: "Successful response",
} as const;

const OPENAPI_DOCUMENT = {
  info: {
    description:
      "Learned-data infrastructure and applied AI API. African languages, beginning with the Nguni family, are the first focus. Proposed offerings are not production capability claims.",
    title: "Izwa API",
    version: "0.2.0",
  },
  openapi: "3.1.0",
  paths: {
    "/api/health": {
      get: {
        responses: { "200": jsonResponse },
        summary: "Check application health",
        tags: ["System"],
      },
    },
    "/api/izwa": {
      get: {
        responses: { "200": jsonResponse },
        summary: "Discover the Izwa API and current focus",
        tags: ["Direction"],
      },
    },
    "/api/izwa/capabilities": {
      get: {
        responses: { "200": jsonResponse },
        summary: "List offering foundations and proposed capabilities",
        tags: ["Direction"],
      },
    },
    "/api/izwa/contract": {
      get: {
        responses: { "200": jsonResponse },
        summary: "Get the active language quality contract",
        tags: ["Learned data"],
      },
    },
    "/api/izwa/datasets": {
      post: {
        responses: { "201": jsonResponse, "422": jsonResponse },
        summary: "Create a dataset container",
        tags: ["Datasets"],
      },
    },
    "/api/izwa/datasets/{datasetId}/versions": {
      post: {
        parameters: [
          {
            in: "path",
            name: "datasetId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "201": jsonResponse,
          "404": jsonResponse,
          "409": jsonResponse,
          "422": jsonResponse,
        },
        summary: "Build a versioned dataset release",
        tags: ["Datasets"],
      },
    },
    "/api/izwa/direction": {
      get: {
        responses: { "200": jsonResponse },
        summary: "Get the canonical company direction and operating stages",
        tags: ["Direction"],
      },
    },
    "/api/izwa/evaluations": {
      get: {
        responses: { "200": jsonResponse },
        summary: "List protected and regression evaluation cases",
        tags: ["Evaluation"],
      },
      post: {
        responses: { "201": jsonResponse, "422": jsonResponse },
        summary: "Create an evaluation case",
        tags: ["Evaluation"],
      },
    },
    "/api/izwa/health": {
      get: {
        responses: { "200": jsonResponse },
        summary: "Check Izwa domain health and focus languages",
        tags: ["System"],
      },
    },
    "/api/izwa/languages": {
      get: {
        parameters: [
          {
            description:
              "Defaults to the Nguni focus. Research includes the wider taxonomy without implying equal product coverage.",
            in: "query",
            name: "scope",
            schema: { enum: ["focus", "research"], type: "string" },
          },
        ],
        responses: { "200": jsonResponse, "422": jsonResponse },
        summary: "List focus or research languages",
        tags: ["Direction"],
      },
    },
    "/api/izwa/media/{assetId}/transcribe": {
      post: {
        parameters: [
          {
            in: "path",
            name: "assetId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": jsonResponse,
          "404": jsonResponse,
          "503": jsonResponse,
        },
        summary: "Produce a draft transcript for a source asset",
        tags: ["Collection"],
      },
    },
    "/api/izwa/media/{key}": {
      put: {
        parameters: [
          {
            in: "path",
            name: "key",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "201": jsonResponse, "422": jsonResponse },
        summary: "Upload a permitted source asset",
        tags: ["Collection"],
      },
    },
  },
  tags: [
    { name: "System" },
    { name: "Direction" },
    { name: "Collection" },
    { name: "Learned data" },
    { name: "Datasets" },
    { name: "Evaluation" },
  ],
} as const;

export const openapiRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>().get("/api/openapi.json", (c) => c.json(OPENAPI_DOCUMENT));

