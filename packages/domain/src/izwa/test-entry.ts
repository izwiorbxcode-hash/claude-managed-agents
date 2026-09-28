// Test-only worker entrypoint for the workers-pool integration tests.
// Mounts only the refinery API and exports the two DO classes, so the
// test bundle stays light (the production entry pulls in the whole
// control plane — containers, puppeteer, isolates — which is unnecessary
// and slow under vitest-pool-workers).

import { refineryApp } from "./api";
import { SwarmCoordinator } from "./coordinator";
import { SpecialistAgent } from "./specialist";

export { SwarmCoordinator, SpecialistAgent };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return refineryApp.fetch(request, env);
  },
};
