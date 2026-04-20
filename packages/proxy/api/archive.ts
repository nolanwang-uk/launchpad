import { handleArchive } from "../src/handler";

export const config = {
  runtime: "edge",
};

export default function handler(req: Request): Promise<Response> {
  return handleArchive(req);
}
