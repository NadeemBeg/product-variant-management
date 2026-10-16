import "express";

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by `requireSeller`. Identity is derived from the bearer token on the
       * server — never from the request body or params. Downstream code reads the
       * seller exclusively from here.
       */
      seller?: { id: string; name: string };
    }
  }
}

export {};
