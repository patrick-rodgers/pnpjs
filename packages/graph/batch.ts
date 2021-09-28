import { isUrlAbsolute, hOP, TimelinePipe, getGUID, From_JulieHatesThisName, objectDefinedNotNull } from "@pnp/core";
import { parseBinderWithErrorCheck, Queryable, body, InjectHeaders } from "@pnp/queryable";
import { IGraphQueryable, _GraphQueryable } from "./graphqueryable.js";
import { graphPost } from "./operations.js";

interface IGraphBatchRequestFragment {
    id: string;
    method: string;
    url: string;
    headers?: HeadersInit;
    body?: any;
}

interface IGraphBatchRequest {
    requests: IGraphBatchRequestFragment[];
}

interface IGraphBatchResponseFragment {
    id: string;
    status: number;
    statusText?: string;
    method: string;
    url: string;
    headers?: string[][] | {
        [key: string]: string;
    };
    body?: any;
}


interface IGraphBatchResponse {
    error?: {
        code: string;
        innerError: { "request-id": string; date: string };
        message: string;
    };
    responses: IGraphBatchResponseFragment[];
    nextLink?: string;
}

type ParsedGraphResponse = { nextLink: string; responses: Response[] };

/**
 * The request record defines a tuple that is
 *
 * [0]: The queryable object representing the request
 * [1]: The request url
 * [2]: Any request init values (headers, etc)
 * [3]: The resolve function back to the promise for the original operation
 * [4]: The reject function back to the promise for the original operation
 */
type RequestRecord = [Queryable, string, RequestInit, (value: Response | PromiseLike<Response>) => void, (reason?: any) => void];

function BatchParse(): TimelinePipe {

    return parseBinderWithErrorCheck(async (response): Promise<ParsedGraphResponse> => {
        const graphResponse: IGraphBatchResponse = await response.json();

        // we need to see if we have an error and report that
        if (hOP(graphResponse, "error")) {
            throw Error(`Error Porcessing Batch: (${graphResponse.error.code}) ${graphResponse.error.message}`);
        }

        return parseResponse(graphResponse);
    });
}

class BatchQueryable extends _GraphQueryable {

    constructor(base: IGraphQueryable, public requestBaseUrl = base.toUrl().replace(/v1\.0|beta\/.*$/i, "")) {

        super(requestBaseUrl, "v1.0/$batch");

        // this will copy over the current observables from the web associated with this batch
        this.using(From_JulieHatesThisName(base, "replace"));

        // this will replace any other parsing present
        this.using(BatchParse());
    }
}

export function createBatch(base: IGraphQueryable, maxRequests = 20): [TimelinePipe, () => Promise<void>] {

    const registrationPromises: Promise<void>[] = [];
    const requests: RequestRecord[] = [];
    const batchId = getGUID();

    const execute = async () => {

        await Promise.all(registrationPromises);

        if (requests.length < 1) {
            return;
        }

        // create a working copy of our requests
        const requestsWorkingCopy = requests.slice();

        // this is the root of our promise chain
        while (requestsWorkingCopy.length > 0) {

            const requestsChunk = requestsWorkingCopy.splice(0, maxRequests);

            const batchRequest: IGraphBatchRequest = {
                requests: formatRequests(requestsChunk, batchId),
            };

            const batchQuery = new BatchQueryable(base);

            batchQuery.using(InjectHeaders({
                "Accept": "application/json",
                "Content-Type": "application/json",
            }));

            const response: ParsedGraphResponse = await graphPost(batchQuery, body(batchRequest));

            // this structure ensures that we resolve the batched requests in the order we expect
            response.responses.reduce((p, response, index) => p.then(() => {

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [, , , resolve, reject] = requestsChunk[index];

                try {

                    resolve(response);

                } catch (e) {

                    reject(e);
                }

            }), Promise.resolve(void (0)));
        }
    };

    const register = (instance: Queryable) => {

        let registrationResolver: (value: void | PromiseLike<void>) => void;

        // we need to ensure we wait to execute until all our batch children hit the .send method to be fully registered
        registrationPromises.push(new Promise((resolve) => {
            registrationResolver = resolve;
        }));

        instance.on.send.replace(async function (this: Queryable, url: URL, init: RequestInit) {

            let requestTuple: RequestRecord;

            const promise = new Promise<Response>((resolve, reject) => {
                requestTuple = [this, url.toString(), init, resolve, reject];
            });

            requests.push(requestTuple);

            registrationResolver();

            return promise;
        });

        return instance;
    };

    return [register, execute];
}

/**
 * Urls come to the batch absolute, but the processor expects relative
 * @param url Url to ensure is relative
 */
function makeUrlRelative(url: string): string {

    if (!isUrlAbsolute(url)) {
        // already not absolute, just give it back
        return url;
    }

    let index = url.indexOf("/v1.0/");

    if (index < 0) {

        index = url.indexOf("/beta/");

        if (index > -1) {

            // beta url
            return url.substr(index + 6);
        }

    } else {
        // v1.0 url
        return url.substr(index + 5);
    }

    // no idea
    return url;
}

function formatRequests(requests: RequestRecord[], batchId: string): IGraphBatchRequestFragment[] {

    return requests.map((reqInfo, index) => {

        const [queryable, url, init] = reqInfo;

        queryable.log(`[${batchId}] (${(new Date()).getTime()}) Adding request ${init.method} ${url} to batch.`, 0);

        let requestFragment: IGraphBatchRequestFragment = {
            id: `${++index}`,
            method: init.method,
            url: makeUrlRelative(url),
        };

        const headers = {
            ...init.headers,
        };

        if (init.method !== "GET") {
            headers["Content-Type"] = "application/json";
        }

        if (objectDefinedNotNull(init.body)) {

            requestFragment = {
                body: JSON.parse(<any>init.body),
                ...requestFragment,
            };
        }

        requestFragment = {
            headers,
            ...requestFragment,
        };

        return requestFragment;
    });
}

function parseResponse(graphResponse: IGraphBatchResponse): Promise<ParsedGraphResponse> {

    return new Promise((resolve, reject) => {

        // we need to see if we have an error and report that
        if (hOP(graphResponse, "error")) {
            return reject(Error(`Error Porcessing Batch: (${graphResponse.error.code}) ${graphResponse.error.message}`));
        }

        const parsedResponses: Response[] = new Array(graphResponse.responses.length).fill(null);

        for (let i = 0; i < graphResponse.responses.length; ++i) {

            const response = graphResponse.responses[i];
            // we create the request id by adding 1 to the index, so we place the response by subtracting one to match
            // the array of requests and make it easier to map them by index
            const responseId = parseInt(response.id, 10) - 1;

            if (response.status === 204) {

                parsedResponses[responseId] = new Response();
            } else {

                parsedResponses[responseId] = new Response(JSON.stringify(response.body), response);
            }
        }

        resolve({
            nextLink: graphResponse.nextLink,
            responses: parsedResponses,
        });
    });
}
