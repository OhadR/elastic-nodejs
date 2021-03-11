import { LayersEsRepository, Layer } from "gvdl-repos-wrapper";
var debug = require('debug')('elastic');

export class LayersEsRepositoryEx extends LayersEsRepository {

    constructor() {
        super();
    }

//     public async getAssets(): Promise<BunchAsset[]> {
//         debug(`getAssets: Retrieving assets`);
//         let hits;
//
//
//         try {
//             const response = await this._elasticClient.search({
//                 index: ASSETS_INDEX,
//                 size: 5000,
// //                body: boolGeoQuery
//                 body: matchAllQuery
//             });
//             hits = response?.hits?.hits;
//         } catch (error) {
//             debug(error);
//             return Promise.reject();
//         }
//
//         debug(`Successfully retrieved ${_.size(hits)} hits`);
//
//         const assets = hits.map(hit => hit._source);
//
//         return Promise.resolve(assets);
//     }


    public async getScroll(): Promise<Layer[]> {
        const allQuotes: Layer[] = [];

        // start things off by searching, setting a scroll timeout, and pushing
        // our first response into the queue to be processed
        let response = await this._elasticClient.search({
            index: this.getIndex(),
            // keep the search results "scrollable" for 30 seconds
            scroll: '30s',
            size: 1000,
            // filter the source to only include the quote field
//            _source: ['quote'],
            body: {
                query: {
                    match_all: {}
                }
            }
        });


        while (true) {

            debug('$$$$$$$$$$$$$$ ' + response.hits.hits.length);
            if(response.hits.hits.length == 0) {
                break;
            }

            // collect the titles from this response
            response.hits.hits.forEach(function (hit) {
                //debug(hit._id);
                allQuotes.push(hit._source)
            });

            // check to see if we have collected all of the quotes
            // if (body.hits.total.value === allQuotes.length) {
            //     console.log('Every quote', allQuotes);
            //     break
            // }

            // get the next response if there are more quotes to fetch
            response = await this._elasticClient.scroll({
                scrollId: response._scroll_id,
                scroll: '30s'
            });
        }

        return Promise.resolve(allQuotes);
    }
}