/* globals qq */
/**
 * Implements the Put Block List Azure REST API call.  http://msdn.microsoft.com/en-us/library/windowsazure/dd179467.aspx.
 */
qq.azure.PutBlockList = function(o) {
    "use strict";

    var requester,
        method = "PUT",
        blockIds = {},
        promises = {},
        options = {
            getBlobMetadata: function(id) {},
            log: function(str, level) {}
        },
        endpoints = {},
        endpointHandler = {
            get: function(id) {
                return endpoints[id];
            }
        };

    qq.extend(options, o);

    requester = qq.extend(this, new qq.AjaxRequester({
        validMethods: [method],
        method: method,
        successfulResponseCodes: (function() {
            var codes = {};
            codes[method] = [201];
            return codes;
        }()),
        customHeaders: function(id) {
            var params = options.getBlobMetadata(id);

            return qq.azure.util.getParamsAsHeaders(params);
        },
        contentType: "text/plain",
        endpointStore: endpointHandler,
        allowXRequestedWithAndCacheControl: false,
        cors: {
            expected: true
        },
        log: options.log,
        onSend: function() {},
        onComplete: function(id, xhr, isError) {
            var promise = promises[id];

            delete endpoints[id];
            delete promises[id];
            delete blockIds[id];

            if (isError) {
                promise.failure(xhr);
            }
            else {
                promise.success(xhr);
            }

        }
    }));

    function createRequestBody(blockIds) {
        var doc = document.implementation.createDocument(null, "BlockList", null);

        // Construct an XML document for each pair of etag/part values that correspond to part uploads.
        qq.each(blockIds, function(idx, blockId) {
            var latestEl = doc.createElement("Latest"),
                latestTextEl = doc.createTextNode(blockId);

            latestEl.appendChild(latestTextEl);
            qq(doc).children()[0].appendChild(latestEl);
        });

        // Turn the resulting XML document into a string fit for transport.
        return new XMLSerializer().serializeToString(doc);
    }

    qq.extend(this, {
        method: method,
        send: function(id, sasUri, blockIds, fileMimeType, registerXhrCallback) {
            var promise = new qq.Promise(),
                blockIdsXml = createRequestBody(blockIds),
                xhr;

            promises[id] = promise;

            options.log(qq.format("Submitting Put Block List request for {}", id));

            endpoints[id] = qq.format("{}&comp=blocklist", sasUri);

            xhr = requester.initTransport(id)
                .withPayload(blockIdsXml)
                .withHeaders({"x-ms-blob-content-type": fileMimeType})
                .send();
            registerXhrCallback(xhr);

            return promise;
        }
    });
};
