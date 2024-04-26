/**
 * A new Google Apps Script library called GeminiWithFiles simplifies using Gemini,
 * a large language model, to process unstructured data like images and PDFs.
 * GeminiWithFiles can upload files, generate content, and create descriptions
 * from multiple images at once.
 * This significantly reduces workload and expands possibilities for using Gemini.
 */
class GeminiWithFiles {

  /**
   *
   * @param {Object} object API key or access token for using Gemini API.
   * @param {String} object.apiKey API key.
   * @param {String} object.accessToken Access token.
   * @param {String} object.model Model. Default is "models/gemini-1.5-pro-latest".
   * @param {String} object.version Version of API. Default is "v1beta".
   * @param {Boolean} object.doCountToken Default is false. If this is true, when Gemini API is requested, the token of request is shown in the log.
   * @param {Array} object.history History for continuing chat.
   * @param {Array} object.functions If you want to give the custom functions, please use this.
   */
  constructor(object = {}) {
    const { apiKey, accessToken, model, version, doCountToken, history, functions } = object;

    /** @private */
    this.model = model || "models/gemini-1.5-pro-latest";

    /** @private */
    this.version = version || "v1beta";

    const baseUrl = "https://generativelanguage.googleapis.com";

    /** @private */
    this.urlGenerateContent = `${baseUrl}/${this.version}/${this.model}:generateContent`;

    /** @private */
    this.urlUploadFile = `${baseUrl}/upload/${this.version}/files`;

    /** @private */
    this.urlGetFileList = `${baseUrl}/${this.version}/files`;

    /** @private */
    this.urlDeleteFile = `${baseUrl}/${this.version}/`;

    /** @private */
    this.urlCountToken = `${baseUrl}/${this.version}/${this.model}:countTokens`;

    /** @private */
    this.doCountToken = doCountToken || false;

    /** @private */
    this.queryParameters = {};
    if (apiKey) {
      this.queryParameters.key = apiKey;
    }

    /** @private */
    this.accessToken = accessToken || ScriptApp.getOAuthToken();

    /** @private */
    this.headers = { authorization: `Bearer ${this.accessToken}` };

    /** @private */
    this.fileIds = [];

    /** @private */
    this.asImage = false;

    /** @private */
    this.pdfAsImage = false;

    /** @private */
    this.blobs = [];

    /** @private */
    this.fileList = [];

    /**
     * Functions for function calling of Gemini API. You can see the default functions as follows. You can create the value of functions by confirming the default values.
     * 
     * ```
     * console.log(new GeminiWithFiles().functions);
     * ```
     * 
     * @type {Object}
     */
    this.functions = {
      params_: {
        customType_string: {
          description:
            "Output type is string type. When the output type is string type, this is used. No descriptions and explanations.",
          parameters: {
            type: "OBJECT",
            properties: {
              items: {
                type: "STRING",
                description:
                  "Output type is string type. When the output type is string type, this is used. No descriptions and explanations.",
              },
            },
            required: ["items"],
          },
        },
        customType_number: {
          description:
            "Output type is number type. When the output type is number type, this is used. No descriptions and explanations.",
          parameters: {
            type: "OBJECT",
            properties: {
              items: {
                type: "NUMBER",
                description:
                  "Output type is number type. When the output type is number type, this is used. No descriptions and explanations.",
              },
            },
            required: ["items"],
          },
        },
        customType_boolean: {
          description:
            "Output type is boolean type. When the output type is boolean type, this is used. No descriptions and explanations.",
          parameters: {
            type: "OBJECT",
            properties: {
              items: {
                type: "BOOLEAN",
                description:
                  "Output type is boolean type. When the output type is boolean type, this is used. No descriptions and explanations.",
              },
            },
            required: ["items"],
          },
        },
        customType_array: {
          description:
            "Output type is array type. When the output type is array type, this is used. No descriptions and explanations.",
          parameters: {
            type: "OBJECT",
            properties: {
              items: {
                type: "ARRAY",
                description:
                  "Output type is array type. When the output type is array type, this is used. No descriptions and explanations.",
              },
            },
            required: ["items"],
          },
        },
        customType_object: {
          description:
            "Output type is JSON object type. When the output type is object type, this is used. No descriptions and explanations.",
          parameters: {
            type: "OBJECT",
            properties: {
              items: {
                type: "OBJECT",
                description:
                  "Output type is JSON object type. When the output type is object type, this is used. No descriptions and explanations.",
              },
            },
            required: ["items"],
          },
        },
      },
      customType_string: (e) => e.items,
      customType_number: (e) => e.items,
      customType_boolean: (e) => e.items,
      customType_array: (e) => e.items,
      customType_object: (e) => e.items,
    };

    if (functions && functions.params_) {
      this.functions = functions;
    }

    /**
     * Array including the history of chat with Gemini.
     * 
     * @type {Array}
     */
    this.history = history || [];
  }

  /**
   * ### Description
   * Set file IDs.
   *
   * @param {Array} fileIds File IDs on Google Drive for uploading to Gemini.
   * @param {Boolean} asImage Default is false. If this is true, all files are used as the thumbnail images.
   * @returns {GeminiWithFiles}.
   */
  setFileIds(fileIds, asImage = false) {
    this.fileIds.push(...fileIds);
    this.asImage = asImage;
    return this;
  }

  /**
   * ### Description
   * Set blobs.
   *
   * @param {Blob[]} blobs Blobs for uploading to Gemini.
   * @param {Boolean} pdfAsImage Default is false. If this is true, when the blob is PDF data, each page is converted to image data.
   * @returns {GeminiWithFiles}.
   */
  setBlobs(blobs, pdfAsImage = false) {
    this.blobs.push(...blobs);
    this.pdfAsImage = pdfAsImage;
    return this;
  }

  /**
   * ### Description
   * Create object for using the generateContent method.
   * 
   * @param {Array} fileList File list from the uploadFiles and getFileList method.
   * @returns {GeminiWithFiles}
   */
  withUploadedFilesByGenerateContent(fileList = []) {
    if (fileList.length == 0) {
      throw new Error("Given fileList is empty.");
    }
    const obj = fileList.reduce((m, e) => {
      let k = "";
      if (/^fileId@.*?\$page@.*\$maxPage@.*$/.test(e.displayName)) {
        k = e.displayName.split("$")[0].split("@")[1];
      } else if (/^blobName@.*$/.test(e.displayName)) {
        k = e.displayName.split("@")[1];
      } else {
        k = e.displayName;
      }
      return m.set(k, m.has(k) ? [...m.get(k), e] : [e]);
    }, new Map());
    obj.forEach((v, k, m) => {
      if (v.length > 0 && /^fileId@.*?\$page@.*\$maxPage@.*$/.test(v[0])) {
        v.sort((a, b) => Number(a.displayName.split("$")[1].split("@")[1]) > Number(b.displayName.split("$")[1].split("@")[1]) ? 1 : -1);
      }
      m.set(k, v);
    });
    this.fileList = [...obj.values()].map(files => ({ files }));
    return this;
  }

  /**
  * ### Description
  * Convert PDF to images.
  *
  * @private
  * @param {String} fileId File ID.
  * @param {Blob} blob PDF blob.
  * @param {String} url Endpoint for uploading a file.
  * @returns {Array} Array including blobs of the converted images.
  */
  async pdf2images_(fileId, blob, url) {
    const images = await PDFApp.setPDFBlob(blob)
      .convertPDFToPng()
      .catch((err) => {
        throw new Error(err);
      });
    const maxPage = images.length;
    return images.map((file, i) => {
      const metadata = { file: { displayName: `fileId@${fileId}$page@${i + 1}$maxPage@${maxPage}` } };
      return {
        url,
        method: "post",
        payload: { metadata: Utilities.newBlob(JSON.stringify(metadata), "application/json"), file },
        muteHttpExceptions: true
      };
    });
  }

  /**
   * ### Description
   * Upload files to Gemini.
   *
   * @param {Number} n Number of concurrent upload to Gemini. Default value is 50.
   * @returns {Object} Returned object from Gemini.
   */
  async uploadFiles(n = 50) {
    const q = { ...this.queryParameters, uploadType: "multipart" };
    const url = this.addQueryParameters_(this.urlUploadFile, q);
    if (this.fileIds.length > 0) {
      const requests = [];
      for (let i = 0; i < this.fileIds.length; i++) {
        const fileId = this.fileIds[i];
        const inputFile = DriveApp.getFileById(fileId);
        const mimeType = inputFile.getMimeType();
        if (this.asImage && [MimeType.PDF, MimeType.GOOGLE_DOCS, MimeType.GOOGLE_SHEETS, MimeType.GOOGLE_SLIDES].includes(mimeType)) {
          requests.push(...await this.pdf2images_(fileId, inputFile.getBlob(), url));
        } else {
          const metadata = { file: { displayName: `fileId@${fileId}$page@${1}$maxPage@1` } };
          const file = this.asImage ? this.fetch_({ url: `https://drive.google.com/thumbnail?sz=w1500&id=${fileId}`, headers: this.headers }).getBlob() : DriveApp.getFileById(fileId).getBlob();
          requests.push({
            url,
            method: "post",
            payload: { metadata: Utilities.newBlob(JSON.stringify(metadata), "application/json"), file },
            muteHttpExceptions: true
          });
        }
      }
      return this.requestUploadFiles_(requests, n);
    } else if (this.blobs.length > 0) {
      const requests = [];
      for (let i = 0; i < this.blobs.length; i++) {
        const blob = this.blobs[i];
        if (this.pdfAsImage && blob.getContentType() == MimeType.PDF) {
          requests.push(...await this.pdf2images_(blob.getName(), blob, url));
        } else {
          const metadata = { file: { displayName: `blobName@${blob.getName()}` } };
          requests.push({
            url,
            method: "post",
            payload: { metadata: Utilities.newBlob(JSON.stringify(metadata), "application/json"), file: blob },
            ...(this.queryParameters.key ? {} : { headers: this.headers }),
            muteHttpExceptions: true
          });
        }
      }
      return this.requestUploadFiles_(requests, n);
    }
    throw new Error("No upload items.");
  }

  /**
   * ### Description
   * Request upload file method.
   * 
   * @private
   * @param {Object} requests Requests including parameters.
   * @param {Number} n Number of concurrent uploadto Gemini.
   * @returns {Object} Returned object from Gemini.
   */
  requestUploadFiles_(requests, n) {
    console.log(`Total number of items: ${requests.length}`);
    const split = [...Array(Math.ceil(requests.length / n))].map((_) => requests.splice(0, n));
    const uploadedFiles = split.flatMap((requests, i, a) => {
      console.log(`Upload process: ${i + 1}/${a.length} every ${n} items.`);
      return UrlFetchApp.fetchAll(requests).map(r => JSON.parse(r.getContentText())).reduce((ar, { file }) => {
        if (file) {
          ar.push(file);
        }
        return ar;
      }, []);
    });
    return uploadedFiles;
  }

  /**
   * ### Description
   * Get file list in Gemini.
   * 
   * @returns {Array} File list.
   */
  getFileList() {
    const fileList = []
    const q = { ...this.queryParameters, pageSize: 100 };
    let pageToken = "";
    do {
      q.pageToken = pageToken;
      const url = this.addQueryParameters_(this.urlGetFileList, q);
      const res = this.fetch_({ url, ...(this.queryParameters.key ? {} : { headers: this.headers }) });
      const obj = JSON.parse(res.getContentText());
      pageToken = obj.nextPageToken;
      const files = obj.files;
      if (files && files.length > 0) {
        fileList.push(...files);
      }
    } while (pageToken);
    this.fileList = fileList;
    return this.fileList;
  }

  /**
   * ### Description
   * Delete files from Gemini.
   *
   * @param {Array} names Array including names of the files on Gemini.
   * @param {Number} n Number of concurrent delete files. Default value is 50.
   * @returns {Array} Array including response values. When the delete is successed, no response is returned.
   */
  deleteFiles(names, n = 50) {
    const requests = names.map(name => ({
      url: `${this.urlDeleteFile}${name}` + (this.queryParameters.key ? `?key=${this.queryParameters.key}` : ""),
      method: "delete",
      ...(this.queryParameters.key ? {} : { headers: this.headers }),
      muteHttpExceptions: true
    }));
    if (requests.length == 0) return [];
    console.log(`${requests.length} items are deleted.`);
    const split = [...Array(Math.ceil(requests.length / n))].map((_) => requests.splice(0, n));
    return split.flatMap(requests => UrlFetchApp.fetchAll(requests).map(r => JSON.parse(r.getContentText())));
  }

  /**
   * ### Description
   * Main method.
   *
   * @param {Object} object Object using Gemini API.
   * @param {String} object.q Input text.
   * @returns {(String|Number|Array|Object|Boolean)} Output value.
   */
  generateContent(object) {
    if (!object || typeof object != "object") {
      throw new Error("Please set object including question.");
    }
    let { q } = object;
    if (!q || q === "") {
      throw new Error("Please set a question.");
    }
    let uploadedFiles = this.fileList.length > 0 ? this.fileList : [];
    if (uploadedFiles.length > 0) {
      const n = uploadedFiles.reduce((n, o) => (n += o.files ? o.files.length : 1), 0);
      console.log(`${n} uploaded files are used with generateCotent.`);
    }
    const function_declarations = Object.keys(this.functions).flatMap((k) =>
      k != "params_"
        ? {
          name: k,
          description: this.functions.params_[k].description,
          parameters: this.functions.params_[k]?.parameters,
        }
        : []
    );
    const files = uploadedFiles.flatMap(({ files, mimeType, uri, name }) => {
      if (files && Array.isArray(files)) {
        if (/^fileId@.*?\$page@.*\$maxPage@.*$/.test(files[0].displayName)) {
          name = files[0].displayName.split("$")[0].split("@")[1];
          return [
            { text: `[Filename of the following file is ${name}. Total pages are ${files.length}.]` },
            ...files.flatMap(({ mimeType, uri }) => ({ fileData: { fileUri: uri, mimeType } }))
          ];
        } else if (/^blobName@.*$/.test(files[0].displayName)) {
          name = files[0].displayName.split("@")[1];
          return [
            { text: `[Filename of the following file is ${name}. Total pages are 1.]` },
            ...files.flatMap(({ mimeType, uri }) => ({ fileData: { fileUri: uri, mimeType } }))
          ];
        } else {
          name = files[0].displayName;
          return [
            { text: `[Filename of the following file is ${name}. Total pages are 1.]` },
            ...files.flatMap(({ mimeType, uri }) => ({ fileData: { fileUri: uri, mimeType } }))
          ];
        }
      }
      return [
        { text: `[Filename of the following file is ${name}. Total pages are 1.]` },
        { fileData: { fileUri: uri, mimeType } }
      ];
    });
    const contents = [...this.history, { parts: [{ text: q }, ...files], role: "user" }];
    let check = true;
    const results = [];
    let retry = 5;
    const url = this.addQueryParameters_(this.urlGenerateContent, this.queryParameters);
    do {
      retry--;
      const payload = { contents, tools: [{ function_declarations }] };
      if (this.doCountToken) {
        const res = this.fetch_({
          url: this.addQueryParameters_(this.urlCountToken, this.queryParameters),
          method: "post",
          payload: JSON.stringify({ contents: payload.contents }),
          contentType: "application/json",
          ...(this.queryParameters.key ? {} : { headers: this.headers }),
          muteHttpExceptions: true,
        }, true);
        console.log(res.getContentText());
      }
      const res = this.fetch_({
        url,
        method: "post",
        payload: JSON.stringify(payload),
        contentType: "application/json",
        ...(this.queryParameters.key ? {} : { headers: this.headers }),
        muteHttpExceptions: true,
      }, false);
      if (res.getResponseCode() == 500 && retry > 0) {
        console.warn("Retry by the status code 500.");
        console.warn(res.getContentText());
        Utilities.sleep(3000);
        this.generateContent({ q });
      } else if (res.getResponseCode() != 200) {
        throw new Error(res.getContentText());
      }
      const { candidates } = JSON.parse(res.getContentText());
      if (candidates && !candidates[0]?.content?.parts) {
        results.push(candidates[0]);
        break;
      }
      const parts = (candidates && candidates[0]?.content?.parts) || [];
      results.push(...parts);
      contents.push({ parts: parts.slice(), role: "model" });
      check = parts.find((o) => o.hasOwnProperty("functionCall"));
      if (check && check.functionCall?.name) {
        const functionName = check.functionCall.name;
        const res2 = this.functions[functionName](
          check.functionCall.args || null
        );
        contents.push({
          parts: [
            {
              functionResponse: {
                name: functionName,
                response: { name: functionName, content: res2 },
              },
            },
          ],
          role: "function",
        });
        parts.push({ functionResponse: res2 });
        results.push(...parts);
        this.history = contents;
        if (/^customType_.*/.test(functionName)) {
          if (res2.hasOwnProperty("items") && Object.keys(e).length == 1) {
            return res2.items;
          } else if (Array.isArray(res2) && res2.every(e => e.hasOwnProperty("items") && Object.keys(e).length == 1)) {
            return res2.map(e => e.items || e);
          }
          return res2;
        }
      } else {
        this.history = contents;
      }
    } while (check && retry > 0);
    const output = results.pop();
    if (
      !output ||
      (output.finishReason &&
        ["OTHER", "RECITATION"].includes(output.finishReason))
    ) {
      console.warn(output);
      return "No values.";
    }
    return output.text.trim();
  }

  /**
   * ### Description
   * This method is used for adding the query parameters to the URL.
   * Ref: https://tanaikech.github.io/2018/07/12/adding-query-parameters-to-url-using-google-apps-script/
   * 
   * @private
   * @param {String} url The base URL for adding the query parameters.
   * @param {Object} obj JSON object including query parameters.
   * @return {String} URL including the query parameters.
   */
  addQueryParameters_(url, obj) {
    return (url == "" ? "" : `${url}?`) + Object.entries(obj).flatMap(([k, v]) => Array.isArray(v) ? v.map(e => `${k}=${encodeURIComponent(e)}`) : `${k}=${encodeURIComponent(v)}`).join("&");
  }

  /**
  * ### Description
  * Request Gemini API.
  *
  * @private
  * @param {Object} obj Object for using UrlFetchApp.fetchAll.
  * @returns {UrlFetchApp.HTTPResponse} Response from API.
  */
  fetch_(obj, checkError = true) {
    obj.muteHttpExceptions = true;
    const res = UrlFetchApp.fetchAll([obj])[0];
    if (checkError) {
      if (res.getResponseCode() != 200) {
        throw new Error(res.getContentText());
      }
    }
    return res;
  }
}
