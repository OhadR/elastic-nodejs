import { ElasticConfig } from "../types/config-type";

export class Config {
  private static _instance: Config;

  private constructor() {
  }

  public static get instance() {
    return this._instance || (this._instance = new this());
  }

  get elasticSearch(): ElasticConfig {
    const url = process.env.ELASTIC_SEARCH_URL;
    if (!url) {
      return null;
    }
    return { url };
  }
}


