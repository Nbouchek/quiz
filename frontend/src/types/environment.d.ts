import type { Env } from '.'

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}
