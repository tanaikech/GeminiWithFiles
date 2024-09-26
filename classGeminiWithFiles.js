/**
 * A new Google Apps Script library called GeminiWithFiles simplifies using Gemini,
 * a large language model, to process unstructured data like images and PDFs.
 * GeminiWithFiles can upload files, generate content, and create descriptions
 * from multiple images at once.
 * This significantly reduces workload and expands possibilities for using Gemini.
 * 
 * GeminiWithFiles v2.0.2
 * GitHub: https://github.com/tanaikech/GeminiWithFiles
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
   * @param {String} object.response_mime_type In the current stage, only "application/json" can be used.
   * @param {String} object.responseMimeType In the current stage, only "application/json" can be used.
   * @param {Object} object.response_schema JSON schema for controlling the output format.
   * @param {Object} object.responseSchema JSON schema for controlling the output format.
   * @param {Number} object.temperature Control the randomness of the output.
   * @param {Object} object.systemInstruction Ref: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini.
   * @param {Boolean} object.exportTotalTokens When this is true, the total tokens are exported as the result value. At that time, the generated content and the total tokens are returned as an object.
   * @param {Boolean} object.exportRawData The default value is false. When this is true, the raw data returned from Gemini API is returned.
   * @param {Object} object.toolConfig The default is null. If you want to directly give the object of "toolConfig", please use this.
   * @param {Array} object.tools The default value is null. For example, when you want to use "codeExecution", please set `tools: [{ codeExecution: {}}]`.
   */
  constructor(object = {}) {
    const { apiKey, accessToken, model, version, doCountToken, history, functions, response_mime_type, responseMimeType, response_schema = null, responseSchema = null, temperature = null, systemInstruction, exportTotalTokens, exportRawData, toolConfig, tools } = object;

    /** @private */
    this.model = model || "models/gemini-1.5-flash-latest"; // After v2.0.0, the model was changed from "models/gemini-1.5-pro-latest" to "models/gemini-1.5-flash-latest".

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
    this.exportTotalTokens = exportTotalTokens || false;

    /** @private */
    this.exportRawData = exportRawData || false;

    /** @private */
    this.totalTokens = 0;

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
    this.blobs = [];

    /** @private */
    this.resumableUplaods = [];

    /** @private */
    this.fileList = [];

    /** @private */
    this.response_mime_type = "";

    /** @private */
    this.systemInstruction = systemInstruction || null;

    this.functions = {};

    if ((response_mime_type && response_mime_type != "") || (responseMimeType && responseMimeType != "")) {
      this.response_mime_type = response_mime_type || responseMimeType;
    }
    if ((response_schema && typeof response_schema == "object") || (responseSchema && typeof responseSchema == "object")) {
      this.response_schema = response_schema || responseSchema;
    }
    this.temperature = temperature === null ? null : temperature;

    if (functions && functions.params_) {
      this.functions = functions;
    }

    /** @private */
    this.toolConfig = toolConfig || {};
    const keys = Object.keys(this.functions);
    if (keys.length > 0) {
      this.toolConfig = {
        ...this.toolConfig,
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: keys.filter(e => e != "params")
        }
      }
    }

    /**
     * Array including the history of chat with Gemini.
     * 
     * @type {Array}
     */
    this.history = history || [];

    /** @private */
    this.tools = tools || [];
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
   * @returns {GeminiWithFiles}.
   */
  setBlobs(blobs) {
    this.blobs.push(...blobs);
    return this;
  }

  /**
   * ### Description
   * Upload data (files) to Gemini with resumable upload.
   * In this case, you can use the file ID on Google Drive and the URL of the direct link of the file.
   *
   * @param {Array} array Array including the file IDs or URLs for uploading to Gemini.
   * @returns {GeminiWithFiles}.
   */
  setFileIdsOrUrlsWithResumableUpload(array) {
    this.resumableUplaods.push(...array);
    return this;
  }

  /**
   * ### Description
   * Create object for using the generateContent method.
   * 
   * @param {Array} fileList File list from the uploadFiles and getFileList method.
   * @returns {GeminiWithFiles}
   */
  withUploadedFilesByGenerateContent(fileList = [], retry = 3) {
    if (fileList.length == 0) {
      throw new Error("Given fileList is empty.");
    }
    const checkState = fileList.filter(({ state }) => state == "PROCESSING");
    if (checkState.length > 0) {
      if (retry > 0) {
        const waitTime = 10; // seconds
        const dn = checkState.map(({ displayName }) => displayName)
        console.warn(`Now, the state of the uploaded files "${dn.join(",")}" is not active. So, it will wait until it is active. Please wait for ${waitTime} seconds. Retry (${4 - retry}/3)`);
        const tempObj = fileList.reduce((o, { name }) => (o[name] = true, o), {});
        const tempList = this.getFileList().filter(({ name }) => tempObj[name]);
        Utilities.sleep(waitTime * 1000);
        this.withUploadedFilesByGenerateContent(tempList, --retry);
      } else {
        console.warn("Although It waited for 30 seconds, the state of the uploaded files has not changed to active. In this case, please directly retrieve the metadata of the uploaded file after the state becomes active and generate content again.");
      }
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
   * Upload files to Gemini.
   *
   * @param {Number} n Number of concurrent upload to Gemini. Default value is 50.
   * @returns {Object} Returned object from Gemini.
   */
  uploadFiles(n = 50) {
    const q = { ...this.queryParameters, uploadType: "multipart" };
    const url = this.addQueryParameters_(this.urlUploadFile, q);
    if (this.fileIds.length > 0) {
      const requests = [];
      for (let i = 0; i < this.fileIds.length; i++) {
        const fileId = this.fileIds[i];
        const metadata = { file: { displayName: `fileId@${fileId}$page@${1}$maxPage@1` } };
        const file = this.asImage
          ? this.fetch_({ url: `https://drive.google.com/thumbnail?sz=w1500&id=${fileId}`, headers: this.headers }).getBlob()
          : DriveApp.getFileById(fileId).getBlob();
        requests.push({
          url,
          method: "post",
          payload: { metadata: Utilities.newBlob(JSON.stringify(metadata), "application/json"), file },
          muteHttpExceptions: true
        });
      }
      return this.requestUploadFiles_(requests, n);
    } else if (this.blobs.length > 0) {
      const requests = [];
      for (let i = 0; i < this.blobs.length; i++) {
        const blob = this.blobs[i];
        const metadata = { file: { displayName: `blobName@${blob.getName()}` } };
        requests.push({
          url,
          method: "post",
          payload: { metadata: Utilities.newBlob(JSON.stringify(metadata), "application/json"), file: blob },
          ...(this.queryParameters.key ? {} : { headers: this.headers }),
          muteHttpExceptions: true
        });
      }
      return this.requestUploadFiles_(requests, n);
    } else if (this.resumableUplaods.length > 0) {
      return this.resumableUplaods.map(e => this.uploadApp_(e));
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
  generateContent(object, retry = 5) {
    if (!object || typeof object != "object") {
      throw new Error("Please set object including question.");
    }
    let { q, jsonSchema, parts } = object;
    if ((!q || q === "") && (!jsonSchema || typeof jsonSchema != "object") && (!parts || !Array.isArray(parts))) {
      throw new Error("Please set a question.");
    }
    if ((!q || q === "") && (jsonSchema || typeof jsonSchema == "object") && !parts) {
      q = `Follow JSON schema.<JSONSchema>${JSON.stringify(jsonSchema)}</JSONSchema>`;
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
    const contents = [...this.history]
    if (!q && !jsonSchema && parts) {
      contents.push({ parts: [...parts, ...files], role: "user" });
    } else {
      contents.push({ parts: [{ text: q }, ...files], role: "user" });
    }
    let check = true;
    let usageMetadataObj;
    const results = [];
    let rawResult = {};
    const url = this.addQueryParameters_(this.urlGenerateContent, this.queryParameters);
    do {
      retry--;
      const payload = { contents, tools: [{ function_declarations }] };

      payload.generationConfig = {};
      if (this.response_mime_type != "") {
        payload.generationConfig.response_mime_type = this.response_mime_type;
      }
      if (this.response_schema) {
        payload.generationConfig.response_schema = this.response_schema;
        payload.generationConfig.response_mime_type = "application/json";
      }
      if (this.temperature !== null) {
        payload.generationConfig.temperature = this.temperature;
      }

      if (this.systemInstruction) {
        payload.systemInstruction = this.systemInstruction;
      }
      if (Object.keys(this.toolConfig).length > 0) {
        payload.toolConfig = this.toolConfig;
      }
      if (this.tools) {
        payload.tools = this.tools;
      }
      if (this.doCountToken) {
        const res = this.fetch_({
          url: this.addQueryParameters_(this.urlCountToken, this.queryParameters),
          method: "post",
          payload: JSON.stringify({ contents: payload.contents }),
          contentType: "application/json",
          ...(this.queryParameters.key ? {} : { headers: this.headers }),
          muteHttpExceptions: true,
        }, false);
        if (res.getResponseCode() != 200) {
          console.error(res.getContentText());

          if (files && files.length > 0) {
            // I confirmed that this issue was resolved on Jun 2, 2024.
            // So, I believe that this warning will not be used.
            console.warn("In the current stage, when the uploaded files are used with countToken, an error like 'PERMISSION_DENIED'. So, at this time, the script is run as 'doCountToken: false'. I have already reported this. https://issuetracker.google.com/issues/343257597 I believe that this will be resolved in the future update.");
          }

        } else {
          console.log(res.getContentText());
        }
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
        console.warn("If the error 500 is continued, please try 'const g = GeminiWithFiles_test.geminiWithFiles({ apiKey, functions: {} });' and 'const g = GeminiWithFiles_test.geminiWithFiles({ apiKey, response_mime_type: \"application/json\" });'.");
        console.warn(res.getContentText());
        Utilities.sleep(3000);
        this.generateContent({ q, jsonSchema, parts }, retry);
      } else if (res.getResponseCode() != 200) {
        throw new Error(res.getContentText());
      }
      const raw = JSON.parse(res.getContentText());
      if (this.exportRawData) {
        rawResult = { ...raw };
        break;
      }
      const { candidates, usageMetadata } = raw;
      usageMetadataObj = { ...usageMetadata };
      if (candidates && !candidates[0]?.content?.parts) {
        results.push(candidates[0]);
        break;
      }
      const partsAr = (candidates && candidates[0]?.content?.parts) || [];
      results.push(...partsAr);
      contents.push({ parts: partsAr.slice(), role: "model" });
      check = partsAr.find((o) => o.hasOwnProperty("functionCall"));
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
        partsAr.push({ functionResponse: res2 });
        results.push(...partsAr);
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
    if (this.exportRawData) {
      return rawResult;
    }
    const output = results.pop();
    if (
      !output ||
      (output.finishReason &&
        ["OTHER", "RECITATION"].includes(output.finishReason))
    ) {
      console.warn(output);
      return "No values.";
    }
    const returnValue = output.text.trim();
    try {
      if (this.exportTotalTokens) {
        return { returnValue: JSON.parse(returnValue), usageMetadata: usageMetadataObj };
      }
      return JSON.parse(returnValue);
    } catch (stack) {
      // console.warn(stack);
      if (this.exportTotalTokens) {
        return { returnValue, usageMetadata: usageMetadataObj };
      }
      return returnValue;
    }
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

  /**
  * ### Description
  * Upload large file to Gemini with resumable upload.
  ref: https://github.com/tanaikech/UploadApp
  ref: https://medium.com/google-cloud/uploading-large-files-to-gemini-with-google-apps-script-overcoming-50-mb-limit-6ea63204ee81
  *
  * @private
  * @param {Object} obj Object for using UrlFetchApp.fetchAll.
  * @returns {UrlFetchApp.HTTPResponse} Response from API.
  */
  uploadApp_(object) {
    /**
     * ### Description
     * Upload a little large data with Google APIs. The target of this script is the data with several hundred MB.
     * GitHub: https://github.com/tanaikech/UploadApp
     * 
     * Sample situation:
     * - Upload a file from Google Drive to Gemini, Google Drive, YouTube, and so on.
     * - Upload a file from the URL outside of Google to Gemini, Google Drive, YouTube, and so on.
     */
    class UploadApp {

      /**
       *
       * @param {Object} object Information of the source data and the metadata of the destination.
       * @param {Object} object.source Information of the source data.
       * @param {Object} object.destination Information of the metadata of the destination.
       */
      constructor(object = {}) {
        this.property = PropertiesService.getScriptProperties();
        const next = this.property.getProperty("next");
        if (!next && (!object.source || (!object.source.fileId && !object.source.url))) {
          throw new Error("Please set a valid object.");
        } else if (next) {
          this.tempObject = JSON.parse(next);
          this.current = this.tempObject.next;
          this.tempObject.next = 0;
          if (this.tempObject.result) {
            delete this.tempObject.result;
          }
        } else {
          this.current = 0;
          this.tempObject = { orgObject: { ...object } };
        }
        if (this.tempObject.orgObject.source.fileId) {
          this.googleDrive = true;
          this.fileGet = `https://www.googleapis.com/drive/v3/files/${this.tempObject.orgObject.source.fileId}?supportsAllDrives=true`;
          this.downloadUrl = `${this.fileGet}&alt=media`;
        } else {
          this.googleDrive = false;
          this.downloadUrl = this.tempObject.orgObject.source.url;
        }
        this.startTime = Date.now();
        this.limitProcessTime = 300 * 1000; // seconds
        this.authorization = `Bearer ${this.tempObject.orgObject.accessToken || ScriptApp.getOAuthToken()}`;
        this.chunkSize = 16777216; // Chunk size is 16 MB.
      }

      /**
       * ### Description
       * Main method.
       *
       * @returns {Object} Response value. When the file could be completly uploaded, the file metadata of the uploaded file is returned. When the file is not be completly uploaded, an object including message.
       */
      run() {
        if (this.current == 0) {
          console.log("Get metadata");
          this.getMetadata_();
          console.log("Calculate chunks");
          this.getChunks_();
          console.log("Get location");
          this.getLocation_();
        }
        console.log("Download and upload data.");
        this.downloadAndUpload_();
        return this.tempObject.result;
      }

      /**
       * ### Description
       * Get metadata of the source data.
       *
       * @return {void}
       * @private
       */
      getMetadata_() {
        if (this.googleDrive) {
          const res = UrlFetchApp.fetch(`${this.fileGet}&fields=mimeType%2Csize`, { headers: { authorization: this.authorization } });
          const obj = JSON.parse(res.getContentText());
          if (obj.mimeType.includes("application/vnd.google-apps")) {
            throw new Error("This script cannot be used to the files related to Google. For example, Google Doc, Google Sheet, and so on.");
          }
          this.tempObject.orgObject.source.mimeType = obj.mimeType;
          this.tempObject.orgObject.source.size = obj.size;
          return;
        }
        const res = UrlFetchApp.fetch(this.downloadUrl, {
          muteHttpExceptions: true,
          headers: { Range: "bytes=0-1" }
        });
        if (res.getResponseCode() != 206) {
          throw new Error("This file cannot be done the resumable download.");
        }
        const headers = res.getHeaders();
        const range = headers["Content-Range"].split("\/");
        this.tempObject.orgObject.source.fileName = (headers["Content-Disposition"] && headers["Content-Disposition"].match(/filename=\"([a-zA-Z0-9\s\S].+)\";/)) ? headers["Content-Disposition"].match(/filename=\"([a-zA-Z0-9\s\S].+)\";/)[1].trim() : this.startTime.toString();
        this.tempObject.orgObject.source.mimeType = headers["Content-Type"].split(";")[0];
        this.tempObject.orgObject.source.size = Number(range[1]);
      }

      /**
       * ### Description
       * Calculate the chunks for uploading.
       *
       * @return {void}
       * @private
       */
      getChunks_() {
        const chunks = [...Array(Math.ceil(this.tempObject.orgObject.source.size / this.chunkSize))].map((_, i, a) => [
          i * this.chunkSize,
          i == a.length - 1 ? this.tempObject.orgObject.source.size - 1 : (i + 1) * this.chunkSize - 1,
        ]);
        this.tempObject.chunks = chunks;
      }

      /**
       * ### Description
       * Get location URL for uploading.
       *
       * @return {void}
       * @private
       */
      getLocation_() {
        const options = {
          payload: JSON.stringify(this.tempObject.orgObject.destination.metadata),
          contentType: "application/json",
          muteHttpExceptions: true,
        };
        const q = this.parseQueryParameters_(this.tempObject.orgObject.destination.uploadUrl);
        if (!q.queryParameters.uploadType) {
          throw new Error("Please confirm whether your endpoint can be used for the resumable upload. And, please include uploadType=resumable in uploadUrl.");
        }
        if (!q.queryParameters.key) {
          options.headers = { authorization: this.authorization };
        }
        const res = UrlFetchApp.fetch(this.tempObject.orgObject.destination.uploadUrl, options);
        if (res.getResponseCode() != 200) {
          throw new Error(res.getContentText());
        }
        this.tempObject.location = res.getAllHeaders()["Location"];
      }

      /**
       * ### Description
       * Download and upload data.
       *
       * @return {void}
       * @private
       */
      downloadAndUpload_() {
        let res1 = [];
        const len = this.tempObject.chunks.length;
        for (let i = this.current; i < len; i++) {
          const e = this.tempObject.chunks[i];
          const currentBytes = `${e[0]}-${e[1]}`;
          console.log(`Now... ${i + 1}/${len}`);
          const params1 = { headers: { range: `bytes=${currentBytes}` }, muteHttpExceptions: true };
          if (this.googleDrive) {
            params1.headers.authorization = this.authorization;
          }
          console.log(`Start downloading data with ${currentBytes}`);
          res1 = UrlFetchApp.fetch(this.downloadUrl, params1).getContent();
          console.log(`Finished downloading data with ${currentBytes}`);
          const params2 = {
            headers: { "Content-Range": `bytes ${currentBytes}/${this.tempObject.orgObject.source.size}` },
            payload: res1,
            muteHttpExceptions: true,
          };
          console.log(`Start uploading data with ${currentBytes}`);
          const res2 = UrlFetchApp.fetch(this.tempObject.location, params2);
          console.log(`Finished uploading data with ${currentBytes}`);
          const statusCode = res2.getResponseCode();
          if (statusCode == 200) {
            console.log("Done.");
            this.tempObject.result = JSON.parse(res2.getContentText());
          } else if (statusCode == 308) {
            console.log("Upload the next chunk.");
            res1.splice(0, res1.length);
          } else {
            throw new Error(res2.getContentText());
          }
          if ((Date.now() - this.startTime) > this.limitProcessTime) {
            this.tempObject.next = i + 1;
            this.property.setProperty("next", JSON.stringify(this.tempObject));
            break;
          }
        }
        if (this.tempObject.next > 0 && !this.tempObject.result) {
          const message = "There is the next upload chunk. So, please run the script again.";
          console.warn(message);
          this.tempObject.result = { message };
        } else {
          this.property.deleteProperty("next");
        }
      }

      /**
       * ### Description
       * Parse query parameters.
       * ref: https://github.com/tanaikech/UtlApp?tab=readme-ov-file#parsequeryparameters
       * 
       * @param {String} url URL including the query parameters.
       * @return {Array} Array including the parsed query parameters.
       * @private
       */
      parseQueryParameters_(url) {
        if (url === null || typeof url != "string") {
          throw new Error("Please give URL (String) including the query parameters.");
        }
        const s = url.split("?");
        if (s.length == 1) {
          return { url: s[0], queryParameters: null };
        }
        const [baseUrl, query] = s;
        if (query) {
          const queryParameters = query.split("&").reduce(function (o, e) {
            const temp = e.split("=");
            const key = temp[0].trim();
            let value = temp[1].trim();
            value = isNaN(value) ? value : Number(value);
            if (o[key]) {
              o[key].push(value);
            } else {
              o[key] = [value];
            }
            return o;
          }, {});
          return { url: baseUrl, queryParameters };
        }
        return null;
      }
    }

    const { url, fileId } = object;
    const displayName = url ? `url@${url}$page@${1}$maxPage@1` : `fileId@${fileId}$page@${1}$maxPage@1`;
    const obj = {
      destination: {
        uploadUrl: `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${this.queryParameters.key}`,
        metadata: { file: { displayName } }
      },
      accessToken: this.accessToken,
    };
    if (url) {
      obj.source = { url };
    } else if (fileId) {
      obj.source = { fileId };
    } else {
      throw new Error("No URL or file ID.");
    }
    const { file } = new UploadApp(obj).run();
    return file;
  }

}
