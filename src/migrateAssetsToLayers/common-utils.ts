import * as normalize from 'turf-normalize';
var debug = require('debug')('common-utils');

/**
 *
 * @param item: Layer or BunchAsset. is has 'metadata'.
 */
export function fixCaptureOn(item: any) {
    debug('1, ' + item.metadata.captureOn);
    if(!item.metadata.captureOn || item.metadata.captureOn === '') {
        delete item.metadata.captureOn;
        return;
    }

    const date = new Date(item.metadata.captureOn);
    debug('2, ' + date);
    item.metadata.captureOn = //date.toLocaleDateString();
        date.toLocaleDateString('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'}); // 08/19/2020 (month and day with two digits)
    debug('3, ' + item.metadata.captureOn);
}

/**
 *
 * @param item: Layer or BunchAsset. is has 'region'.
 */
export function fixPolygon(item: any) {
    debug('1, ' + JSON.stringify(item.metadata.region));
    if(!item.metadata.region || item.metadata.region === '') {
        delete item.metadata.region;
        return;
    }

    item.metadata.region = normalize(item.metadata.region);
    debug('after normalize: ' + JSON.stringify(item.metadata.region));
}