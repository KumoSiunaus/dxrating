import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import KoaSSE from "koa-event-stream";
import Router from "koa-router";
import { v0Handler, v1Handler } from "./functions/fetch-net-records";
import { AuthParams } from "./lib/client";
const app = new Koa();
const router = new Router();

router.use(async (ctx, next) => {
  try {
    return await next();
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = {
      error: err instanceof Error ? err.message : "internal server error",
    };
  }
});

router.get("/", async (ctx) => {
  ctx.body = {
    message: "みるく is up and running! 🥛",
    _self:
      "https://github.com/gekichumai/dxrating/tree/main/packages/self-hosted-functions",
  };
});

const verificationAuthParams: Koa.Middleware = async (ctx, next) => {
  const region = ctx.params.region ?? (ctx.request.body as any)?.region;
  const { id, password } = (ctx.request.body as any) ?? {};
  if (!id || !password) {
    ctx.status = 400;
    ctx.body = {
      error:
        "`id` and `password` are required parameters but has not been provided",
    };
    return;
  }

  const authParams = { id, password } as AuthParams;

  if (region !== "jp" && region !== "intl") {
    ctx.status = 400;
    ctx.body = {
      error: "unsupported region: `region` must be either `intl` or `jp`",
    };
    return;
  }

  ctx.state.authParams = authParams;
  ctx.state.region = region;
  await next();
};

router.post(
  "/functions/fetch-net-records/v0",
  verificationAuthParams,
  v0Handler
);
router.post(
  "/functions/fetch-net-records/v1/:region",
  KoaSSE(),
  verificationAuthParams,
  v1Handler
);

app.use(cors());
app.use(bodyParser({ enableTypes: ["json"] }));
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(process.env.PORT ?? 3000);
