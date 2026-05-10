/**
 * A new Google Apps Script library called GeminiWithFiles simplifies using Gemini,
 * a large language model, to process unstructured data like images and PDFs.
 * GeminiWithFiles can upload files, generate content, and create descriptions
 * from multiple images at once.
 * This significantly reduces workload and expands possibilities for using Gemini.
 *
 * GeminiWithFiles v2.0.17
 * 20260510
 * GitHub: https://github.com/tanaikech/GeminiWithFiles
 *
 */
class GeminiWithFiles {
  /**
   *
   * @param {Object} object API key or access token for using Gemini API.
   * @param {String} object.apiKey API key.
   * @param {String} object.accessToken Access token.
   * @param {String} object.model Model. Default is "models/gemini-3-flash-preview".
   * @param {String} object.version Version of API. Default is "v1beta".
   * @param {Boolean} object.doCountToken Default is false. If this is true, when Gemini API is requested, the token of request is shown in the log.
   * @param {Array} object.history History for continuing chat.
   * @param {Array} object.functions If you want to give the custom functions, please use this.
   * @param {String} object.response_mime_type In the current stage, "text/plain", "application/json", and "text/x.enum" can be used.
   * @param {String} object.responseMimeType In the current stage, "text/plain", "application/json", and "text/x.enum" can be used.
   * @param {Object} object.response_schema JSON schema for controlling the output format. For OpenAPI schema. https://spec.openapis.org/oas/v3.0.3#schema
   * @param {Object} object.responseSchema JSON schema for controlling the output format. For OpenAPI schema. https://spec.openapis.org/oas/v3.0.3#schema
   * @param {Object} object.response_json_schema JSON schema for controlling the output format. For JSON Schema. https://json-schema.org/
   * @param {Object} object.responseJsonSchema JSON schema for controlling the output format. For JSON Schema. https://json-schema.org/
   * @param {Number} object.temperature Control the randomness of the output.
   * @param {Object} object.systemInstruction Ref: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini.
   * @param {Boolean} object.exportTotalTokens When this is true, the total tokens are exported as the result value. At that time, the generated content and the total tokens are returned as an object.
   * @param {Boolean} object.exportRawData The default value is false. When this is true, the raw data returned from Gemini API is returned.
   * @param {Object} object.toolConfig The default is null. If you want to directly give the object of "toolConfig", please use this.
   * @param {Array} object.tools The default value is null. For example, when you want to use "codeExecution", please set `tools:[{ codeExecution: {}}]`.
   * @param {PropertiesService.Properties} object.propertiesService PropertiesService.getScriptProperties()
   * @param {Boolean} object.resumableUploadAsNewUpload When you want to upload the data with the resumable upload as new upload, please set this as true. The default is false.
   * @param {Object} object.generationConfig The default is {}. The properties of GenerationConfig can be seen at https://ai.google.dev/api/generate-content#v1beta.GenerationConfig
   * @param {String} object.skillFolderId Folder ID on Google Drive for Agent Skills.
   *
   */
  constructor(object = {}) {
    const {
      apiKey,
      accessToken,
      model,
      version,
      doCountToken,
      history,
      functions,
      response_mime_type,
      responseMimeType,
      response_schema = null,
      responseSchema = null,
      response_json_schema = null,
      responseJsonSchema = null,
      temperature = null,
      systemInstruction,
      exportTotalTokens,
      exportRawData,
      toolConfig,
      tools,
      propertiesService,
      resumableUploadAsNewUpload = false,
      generationConfig = {},
      skillFolderId,
    } = object;

    /** @private */
    this.model = model || "models/gemini-3-flash-preview";
    /** @private */
    this.version = version || "v1beta";

    const baseUrl = "https://generativelanguage.googleapis.com";

    /** @private */
    this.urlGenerateContent = `${baseUrl}/${this.version}/${this.model}:generateContent`;
    /** @private */
    this.urlBatchGenerateContent = `${baseUrl}/${this.version}/${this.model}:batchGenerateContent`;
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
    this.queryParameters = apiKey ? { key: apiKey } : {};

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
    this.resumableUploads = [];
    /** @private */
    this.fileList = [];

    /** @private */
    this.skillFolderId = skillFolderId || null;

    this.response_mime_type = response_mime_type || responseMimeType || "";
    this.response_schema = response_schema || responseSchema || null;
    this.response_json_schema =
      response_json_schema || responseJsonSchema || null;
    this.temperature = temperature ?? null;

    this.functions = functions?.params_ ? functions : {};
    if (this.functions && !this.functions.params_) this.functions.params_ = {};

    if (this.skillFolderId) {
      // Register activate_skill function for Agent Skills
      this.functions.params_.activate_skill = {
        description:
          "Activate a specific skill and get detailed instructions and a list of resources. Call this first if you need a skill for the task.",
        parameters: {
          type: "OBJECT",
          properties: { skillName: { type: "STRING" } },
          required: ["skillName"],
        },
      };
      this.functions.activate_skill = (args) => {
        return this._activateSkill(args.skillName);
      };

      // Register read_skill_resource function for Agent Skills
      this.functions.params_.read_skill_resource = {
        description:
          "Read the contents of a resource file (e.g., template) in a skill.",
        parameters: {
          type: "OBJECT",
          properties: {
            skillName: { type: "STRING" },
            fileName: { type: "STRING" },
          },
          required: ["skillName", "fileName"],
        },
      };
      this.functions.read_skill_resource = (args) => {
        return this._readSkillResource(args.skillName, args.fileName);
      };

      // Register run_dynamic_script function for Agent Skills
      this.functions.params_.run_dynamic_script = {
        description:
          "Executes a dynamic JavaScript file from the skill resources to interact with Google Workspace or perform other dynamic operations.",
        parameters: {
          type: "OBJECT",
          properties: {
            skillName: { type: "STRING" },
            scriptName: {
              type: "STRING",
              description: "e.g., sampleScript1.js",
            },
            argsJSON: {
              type: "STRING",
              description: "JSON string containing arguments.",
            },
          },
          required: ["skillName", "scriptName", "argsJSON"],
        },
      };
      this.functions.run_dynamic_script = (args) => {
        return this._runDynamicScript(
          args.skillName,
          args.scriptName,
          args.argsJSON,
        );
      };

      // Register invoke_agent function for Agent Skills (Subagent Executor)
      this.functions.params_.invoke_agent = {
        description:
          "Delegates a sub-task to a specialized subagent. Returns the final response from the subagent.",
        parameters: {
          type: "OBJECT",
          properties: {
            agent_name: {
              type: "STRING",
              description: "The name of the specialized skill or subagent.",
            },
            prompt: {
              type: "STRING",
              description: "The detailed prompt or sub-task description.",
            },
          },
          required: ["agent_name", "prompt"],
        },
      };
      this.functions.invoke_agent = (args) => {
        return this._invokeAgent(args.agent_name, args.prompt);
      };

      // Merge and prepare systemInstruction
      let systemInstructionText = "";
      if (systemInstruction) {
        if (typeof systemInstruction === "string") {
          systemInstructionText = systemInstruction + "\n\n";
        } else if (
          systemInstruction.parts &&
          Array.isArray(systemInstruction.parts)
        ) {
          systemInstructionText =
            systemInstruction.parts.map((p) => p.text).join("\n") + "\n\n";
        }
      }

      const skills = this._discoverSkills();
      const skillList = Object.values(skills)
        .map((s) => `- ${s.name}: ${s.description}`)
        .join("\n");
      systemInstructionText += `You are a highly capable AI agent. To solve the user's request, the following skills are available.\n\n[Available Skills]\n${skillList}\n\nCall 'activate_skill' if necessary to reveal detailed instructions for a skill. You can also use 'invoke_agent' to delegate sub-tasks to specialized subagents. You can also use 'read_skill_resource' or 'run_dynamic_script' if instructed by the active skill. Respond directly to the user after using tools.`;

      /** @private */
      this.systemInstruction = {
        parts: [{ text: systemInstructionText.trim() }],
      };
    } else {
      /** @private */
      this.systemInstruction = systemInstruction || null;
    }

    /** @private */
    this.toolConfig = toolConfig || {};
    const functionKeys = Object.keys(this.functions).filter(
      (e) => e !== "params" && e !== "params_",
    );
    if (functionKeys.length > 0) {
      this.toolConfig = {
        ...this.toolConfig,
        functionCallingConfig: {
          // Always use "AUTO" to allow the model to choose between tools and text.
          mode: "AUTO",
        },
      };
    }

    /**
     * Array including the history of chat with Gemini.
     * @type {Array}
     */
    this.history = history || [];
    /** @private */
    this.tools = tools || [];
    /** @private */
    this.propertiesService = propertiesService;
    /** @private */
    this.resumableUploadAsNewUpload = resumableUploadAsNewUpload;
    /** @private */
    this.generationConfig = generationConfig || {};
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
    this.resumableUploads.push(...array);
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
    if (!fileList.length) {
      throw new Error("Given fileList is empty.");
    }

    const checkState = fileList.filter(({ state }) => state === "PROCESSING");
    if (checkState.length > 0) {
      if (retry > 0) {
        const waitTime = 10; // seconds
        const dn = checkState.map(({ displayName }) => displayName);
        console.warn(
          `Now, the state of the uploaded files "${dn.join(",")}" is not active. So, it will wait until it is active. Please wait for ${waitTime} seconds. Retry (${4 - retry}/3)`,
        );

        const tempSet = new Set(fileList.map(({ name }) => name));
        Utilities.sleep(waitTime * 1000);
        const tempList = this.getFileList().filter(({ name }) =>
          tempSet.has(name),
        );
        return this.withUploadedFilesByGenerateContent(tempList, retry - 1);
      } else {
        console.warn(
          "Although It waited for 30 seconds, the state of the uploaded files has not changed to active. In this case, please directly retrieve the metadata of the uploaded file after the state becomes active and generate content again.",
        );
      }
    }

    const obj = new Map();
    for (const e of fileList) {
      let k = e.displayName;
      if (k.startsWith("fileId@")) k = k.split("$")[0].split("@")[1];
      else if (k.startsWith("blobName@")) k = k.split("@")[1];

      if (obj.has(k)) obj.get(k).push(e);
      else obj.set(k, [e]);
    }

    this.fileList = Array.from(obj.values()).map((files) => {
      if (files.length > 0 && files[0].displayName.startsWith("fileId@")) {
        files.sort(
          (a, b) =>
            Number(a.displayName.split("$")[1].split("@")[1]) -
            Number(b.displayName.split("$")[1].split("@")[1]),
        );
      }
      return { files };
    });

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
      const requests = this.fileIds.map((fileId) => {
        const metadata = {
          file: { displayName: `fileId@${fileId}$page@1$maxPage@1` },
        };
        const file = this.asImage
          ? this.fetch_({
              url: `https://drive.google.com/thumbnail?sz=w1500&id=${fileId}`,
              headers: this.headers,
            }).getBlob()
          : DriveApp.getFileById(fileId).getBlob();
        return {
          url,
          method: "post",
          payload: {
            metadata: Utilities.newBlob(
              JSON.stringify(metadata),
              "application/json",
            ),
            file,
          },
          muteHttpExceptions: true,
        };
      });
      return this.requestUploadFiles_(requests, n);
    }

    if (this.blobs.length > 0) {
      const requests = this.blobs.map((blob) => {
        const metadata = {
          file: { displayName: `blobName@${blob.getName()}` },
        };
        return {
          url,
          method: "post",
          payload: {
            metadata: Utilities.newBlob(
              JSON.stringify(metadata),
              "application/json",
            ),
            file: blob,
          },
          ...(this.queryParameters.key ? {} : { headers: this.headers }),
          muteHttpExceptions: true,
        };
      });
      return this.requestUploadFiles_(requests, n);
    }

    if (this.resumableUploads.length > 0) {
      return this.resumableUploads.map((e) => this.uploadApp_(e));
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
    const uploadedFiles = [];
    const chunks = Math.ceil(requests.length / n);
    for (let i = 0; i < chunks; i++) {
      console.log(`Upload process: ${i + 1}/${chunks} every ${n} items.`);
      const chunk = requests.slice(i * n, (i + 1) * n);
      const responses = UrlFetchApp.fetchAll(chunk);
      for (const r of responses) {
        const file = JSON.parse(r.getContentText()).file;
        if (file) uploadedFiles.push(file);
      }
    }
    return uploadedFiles;
  }

  /**
   * ### Description
   * Get file list in Gemini.
   *
   * @returns {Array} File list.
   */
  getFileList() {
    const fileList = [];
    const q = { ...this.queryParameters, pageSize: 100 };
    let pageToken = "";
    do {
      if (pageToken) q.pageToken = pageToken;
      const url = this.addQueryParameters_(this.urlGetFileList, q);
      const res = this.fetch_({
        url,
        ...(this.queryParameters.key ? {} : { headers: this.headers }),
      });
      const obj = JSON.parse(res.getContentText());
      pageToken = obj.nextPageToken || "";
      if (obj.files && obj.files.length > 0) {
        fileList.push(...obj.files);
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
    if (!names.length) return [];

    const requests = names.map((name) => ({
      url:
        `${this.urlDeleteFile}${name}` +
        (this.queryParameters.key ? `?key=${this.queryParameters.key}` : ""),
      method: "delete",
      ...(this.queryParameters.key ? {} : { headers: this.headers }),
      muteHttpExceptions: true,
    }));

    console.log(`${requests.length} items are deleted.`);
    const results = [];
    const chunks = Math.ceil(requests.length / n);
    for (let i = 0; i < chunks; i++) {
      const chunk = requests.slice(i * n, (i + 1) * n);
      const responses = UrlFetchApp.fetchAll(chunk);
      for (const r of responses) {
        if (r.getContentText()) {
          results.push(JSON.parse(r.getContentText()));
        }
      }
    }
    return results;
  }

  /**
   * ### Description
   * Main method.
   *
   * @param {Object} object Object using Gemini API.
   * @param {String} object.q Input text.
   * @param {Number} [retry] Max iterations for generating content.
   * @returns {(String|Number|Array|Object|Boolean)} Output value.
   */
  generateContent(object, retry) {
    if (!object || typeof object !== "object") {
      throw new Error("Please set object including question.");
    }
    // Set higher retry count for multi-turn tool calling (e.g., Agent Skills)
    if (retry === undefined) retry = this.skillFolderId ? 15 : 5;

    let { q, jsonSchema, parts } = object;
    if (!q && !jsonSchema && (!parts || !Array.isArray(parts))) {
      throw new Error("Please set a question.");
    }
    if (!q && jsonSchema && !parts) {
      q = `Follow JSON schema.<JSONSchema>${JSON.stringify(jsonSchema)}</JSONSchema>`;
    }

    const uploadedFiles = this.fileList;
    if (uploadedFiles.length > 0) {
      const count = uploadedFiles.reduce(
        (acc, o) => acc + (o.files ? o.files.length : 1),
        0,
      );
      console.log(`${count} uploaded files are used with generateContent.`);
    }

    const function_declarations = Object.entries(this.functions).reduce(
      (acc, [k, v]) => {
        if (k !== "params_") {
          acc.push({
            name: k,
            description: this.functions.params_[k]?.description,
            parameters: this.functions.params_[k]?.parameters,
            response: this.functions.params_[k]?.response,
          });
        }
        return acc;
      },
      [],
    );

    const files = uploadedFiles.flatMap(({ files, mimeType, uri, name }) => {
      if (files && Array.isArray(files)) {
        let fileName = files[0].displayName;
        if (fileName.startsWith("fileId@"))
          fileName = fileName.split("$")[0].split("@")[1];
        else if (fileName.startsWith("blobName@"))
          fileName = fileName.split("@")[1];

        return [
          {
            text: `[Filename of the following file is ${fileName}. Total pages are ${files.length}.]`,
          },
          ...files.map((f) => ({
            fileData: { fileUri: f.uri, mimeType: f.mimeType },
          })),
        ];
      }
      return [
        {
          text: `[Filename of the following file is ${name}. Total pages are 1.]`,
        },
        { fileData: { fileUri: uri, mimeType } },
      ];
    });

    const contents = [...this.history];
    if (!q && !jsonSchema && parts) {
      contents.push({ parts: [...parts, ...files], role: "user" });
    } else {
      contents.push({ parts: [{ text: q }, ...files], role: "user" });
    }

    let check = [];
    let usageMetadataObj;
    let results = [];
    let rawResult = {};
    let multipleResults = false;
    let continueLoop = false;
    const url = this.addQueryParameters_(
      this.urlGenerateContent,
      this.queryParameters,
    );
    const requestHeaders = this.queryParameters.key
      ? {}
      : { headers: this.headers };

    do {
      retry--;

      const payload = {
        contents,
        tools:
          function_declarations.length > 0 ? [{ function_declarations }] : [],
      };
      payload.generationConfig = { ...this.generationConfig };

      if (this.response_mime_type)
        payload.generationConfig.response_mime_type = this.response_mime_type;

      if (this.response_schema) {
        payload.generationConfig.response_schema = this.response_schema;
        payload.generationConfig.response_mime_type = "application/json";
      } else if (this.response_json_schema) {
        payload.generationConfig.response_json_schema =
          this.response_json_schema;
        payload.generationConfig.response_mime_type = "application/json";
      }

      if (this.temperature !== null)
        payload.generationConfig.temperature = this.temperature;
      if (this.systemInstruction)
        payload.systemInstruction = this.systemInstruction;
      if (Object.keys(this.toolConfig).length > 0)
        payload.toolConfig = this.toolConfig;
      if (this.tools && this.tools.length > 0) payload.tools = this.tools;

      if (this.doCountToken) {
        const res = this.fetch_(
          {
            url: this.addQueryParameters_(
              this.urlCountToken,
              this.queryParameters,
            ),
            method: "post",
            payload: JSON.stringify({ contents: payload.contents }),
            contentType: "application/json",
            ...requestHeaders,
            muteHttpExceptions: true,
          },
          false,
        );
        if (res.getResponseCode() !== 200) {
          console.error(res.getContentText());
        } else {
          console.log(res.getContentText());
        }
      }

      const res = this.fetch_(
        {
          url,
          method: "post",
          payload: JSON.stringify(payload),
          contentType: "application/json",
          ...requestHeaders,
          muteHttpExceptions: true,
        },
        false,
      );

      if (res.getResponseCode() === 500 && retry > 0) {
        console.warn("Retry by the status code 500.");
        Utilities.sleep(3000);
        return this.generateContent({ q, jsonSchema, parts }, retry);
      } else if (res.getResponseCode() !== 200) {
        throw new Error(res.getContentText());
      }

      const raw = JSON.parse(res.getContentText());
      // Always store the latest raw response
      rawResult = raw;

      const { candidates, usageMetadata } = raw;
      usageMetadataObj = usageMetadata;

      if (!candidates || !candidates[0]?.content?.parts) {
        results.push(candidates?.[0]);
        break;
      }

      const partsAr = candidates[0].content.parts;
      results.push(...partsAr);
      contents.push({ parts: [...partsAr], role: "model" });

      // Check if the model's response contains any function calls
      check = partsAr.filter((pp) => pp.functionCall?.name);

      continueLoop = false;
      let hasCodeExecutionResult = partsAr.some((pp) => pp.codeExecutionResult);
      let hasText = partsAr.some((pp) => pp.text);

      if (check.length > 0) {
        if (check.length > 1) multipleResults = true;
        const partss = [];

        for (const chk of check) {
          const functionName = chk.functionCall.name;
          const res2 = this.functions[functionName](
            chk.functionCall.args || null,
          );

          // Wrap the result properly for the functionResponse role
          partss.push({
            functionResponse: {
              name: functionName,
              response: { name: functionName, content: res2 },
              ...(chk.functionCall.id ? { id: chk.functionCall.id } : {}),
            },
          });

          // Original compatibility logic for early returning custom types
          if (functionName.startsWith("customType_")) {
            if (res2?.items && Object.keys(res2).length === 1)
              return res2.items;
            if (
              Array.isArray(res2) &&
              res2.every((e) => e?.items && Object.keys(e).length === 1)
            ) {
              return res2.map((e) => e.items);
            }
            return res2;
          }
        }

        // Push the function execution results as a new turn in the conversation
        contents.push({ parts: partss, role: "function" });
        this.history = contents;
        continueLoop = true;
      } else if (hasCodeExecutionResult && !hasText) {
        this.history = contents;
        // Prompt the model to continue and provide the final answer
        contents.push({
          role: "user",
          parts: [
            {
              text: "Please provide the final answer based on the code execution result.",
            },
          ],
        });
        continueLoop = true;
      } else {
        // No function calls found. The model provided a standard text/data response.
        this.history = contents;
        continueLoop = false;
      }
    } while (continueLoop && retry > 0);

    // If chat() or exportRawData is used, return the final raw API response
    if (this.exportRawData) {
      return rawResult;
    }

    const output = results[results.length - 1];
    if (
      !output ||
      (output.finishReason &&
        ["OTHER", "RECITATION"].includes(output.finishReason))
    ) {
      console.warn(output);
      return "No values.";
    }

    let returnValue;
    if (multipleResults) {
      console.log("Multiple results are returned as an array.");
      returnValue = results.filter((pp) => pp.functionResponse);
    } else {
      returnValue = output.text ? output.text.trim() : output;
    }

    try {
      if (this.exportTotalTokens)
        return {
          returnValue: JSON.parse(returnValue),
          usageMetadata: usageMetadataObj,
        };
      return JSON.parse(returnValue);
    } catch (stack) {
      if (this.exportTotalTokens)
        return { returnValue, usageMetadata: usageMetadataObj };
      return returnValue;
    }
  }

  /**
   * ### Description
   * This method is used for generating content as chat.
   *
   * @param {Object} obj Object for generating content as chat.
   * @param {Object} options If this is used, the internal values can be reset. For example, when g.chat({ parts: [{ text: "sample" }], role: 'user' }, {functions:[]}) is used, the functions can be cleared.
   * @return {Object} Response value as an object.
   */
  chat(obj, options = {}) {
    this.exportRawData = true;
    for (const [k, v] of Object.entries(options)) {
      if (this[k] !== undefined) this[k] = v;
    }
    const res = this.generateContent(obj);

    // Note: this.history is already fully updated inside generateContent(),
    // including all user inputs, function calls, and model responses.
    // There is no need to manually push to this.history here anymore.

    return res;
  }

  /**
   * Development suspended on 20250722
   * ref: https://issuetracker.google.com/issues/431365432
   */
  /**
   * ### Description
   * This method is used for generating content by the batch requests.
   * ref: https://ai.google.dev/gemini-api/docs/batch-mode
   *
   * @param {Object} obj Object for generating content by the batch requests.
   * @return {Object} Response value as an object.
   */
  batchGenerateContent(object = {}) {
    const { requests = [] } = object;
    if (requests.length === 0)
      throw new Error("No requests for the batch request.");

    const reqs = requests.reduce((ar, r, i) => {
      const n = i + 1;
      if (typeof r === "object" && r.contents) {
        ar.push(JSON.stringify({ key: `request-${n}`, request: r }));
      } else if (typeof r === "string") {
        ar.push(
          JSON.stringify({
            key: `request-${n}`,
            request: { contents: [{ parts: [{ text: r }] }] },
          }),
        );
      }
      return ar;
    }, []);

    if (reqs.length === 0)
      throw new Error("No valid requests for the batch request.");

    const filename = "my-batch-requests";
    console.log(reqs.join("\n"));
    const blob = Utilities.newBlob(
      reqs.join("\n"),
      MimeType.PLAIN_TEXT,
      filename,
    );
    const oo = this.setBlobs([blob]).uploadFiles();
    console.log(oo[0]);
    let [{ name, state, displayName, uri }] = oo;
    console.log({ name, state, displayName });

    while (state !== "ACTIVE") {
      Utilities.sleep(2000);
      const f = this.getFileList().find((e) => e.name === name);
      if (f) state = f.state;
    }

    const payload = {
      batch: {
        display_name: filename,
        input_config: { requests: { file_name: name } },
      },
    };
    const reqObj = {
      url: this.urlBatchGenerateContent,
      method: "post",
      headers: { "x-goog-api-key": this.queryParameters.key },
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };
    console.log(JSON.stringify(reqObj));
    const res = this.fetch_(reqObj);
    console.log(res.getContentText());
  }

  /**
   * ### Description
   * Method for counting tokens of the request.
   *
   * @param {Object} object Object for chat with Gemini API.
   * @returns {Object} Output value.
   */
  countTokens(obj) {
    const res = this.fetch_(
      {
        url: this.addQueryParameters_(this.urlCountToken, this.queryParameters),
        method: "post",
        payload: JSON.stringify(obj),
        contentType: "application/json",
        ...(this.queryParameters.key ? {} : { headers: this.headers }),
        muteHttpExceptions: true,
      },
      false,
    );

    const str = res.getContentText();
    if (res.getResponseCode() !== 200) {
      if (obj.contents && JSON.stringify(obj.contents).includes("fileData")) {
        console.warn(
          "In the current stage, when the uploaded files are used with countToken, an error like 'PERMISSION_DENIED'. So, at this time, the script is run as 'doCountToken: false'. I have already reported this. https://issuetracker.google.com/issues/343257597 I believe that this will be resolved in the future update.",
        );
      }
      throw new Error(str);
    }
    return JSON.parse(str);
  }

  /**
   * ### Description
   * Discover and extract skill metadata from the Google Drive skill folder.
   *
   * @private
   * @returns {Object} Skills metadata.
   */
  _discoverSkills() {
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get(`agent_skills_${this.skillFolderId}`);
    if (cachedData) return JSON.parse(cachedData);

    const folder = DriveApp.getFolderById(this.skillFolderId);
    const folders = folder.getFolders();
    const skills = {};

    while (folders.hasNext()) {
      const subFolder = folders.next();
      const files = subFolder.getFilesByName("SKILL.md");
      if (files.hasNext()) {
        const content = files.next().getBlob().getDataAsString();
        const parsed = this._parseSkillMd(content);
        if (parsed) {
          skills[parsed.name] = {
            name: parsed.name,
            description: parsed.description,
            instructions: parsed.instructions,
            folderId: subFolder.getId(),
          };
        }
      }
    }

    // Also check for plain text files directly in the skill folder
    const txtFiles = folder.getFilesByType(MimeType.PLAIN_TEXT);
    while (txtFiles.hasNext()) {
      const txtFile = txtFiles.next();
      const fileName = txtFile.getName();
      if (fileName.endsWith(".txt")) {
        const name = fileName.replace(".txt", "");
        const content = txtFile.getBlob().getDataAsString();
        skills[name] = {
          name: name,
          description: content.substring(0, 150),
          instructions: content,
          folderId: folder.getId(),
        };
      }
    }

    // Cache the discovered metadata for 1 hour
    cache.put(
      `agent_skills_${this.skillFolderId}`,
      JSON.stringify(skills),
      3600,
    );
    return skills;
  }

  /**
   * ### Description
   * Activate a specific skill by retrieving detailed instructions and resources.
   *
   * @private
   * @param {String} skillName Name of the skill.
   * @returns {String} Detailed instructions and available resources.
   */
  _activateSkill(skillName) {
    const skills = this._discoverSkills();
    const skill = skills[skillName];
    if (!skill) return `[Error] Skill '${skillName}' not found.`;

    const files = DriveApp.getFolderById(skill.folderId).getFiles();
    const fileNames = [];
    while (files.hasNext()) {
      fileNames.push(files.next().getName());
    }

    return `[System: Skill Activated]\nInstructions:\n${skill.instructions}\n\nAvailable Resources (Files):\n${fileNames.join(", ")}`;
  }

  /**
   * ### Description
   * Read the contents of a resource file within the specified skill's folder.
   *
   * @private
   * @param {String} skillName Name of the skill.
   * @param {String} fileName Name of the file.
   * @returns {String} File contents.
   */
  _readSkillResource(skillName, fileName) {
    const skills = this._discoverSkills();
    const skill = skills[skillName];
    if (!skill) return `[Error] Skill '${skillName}' not found.`;

    const files = DriveApp.getFolderById(skill.folderId).getFilesByName(
      fileName,
    );
    if (!files.hasNext())
      return `[Error] File '${fileName}' not found in skill '${skillName}'.`;

    return files.next().getBlob().getDataAsString();
  }

  /**
   * ### Description
   * Execute a dynamic script from the skill resource.
   *
   * @private
   * @param {String} skillName Name of the skill.
   * @param {String} scriptName Name of the script file.
   * @param {String|Object} argsJSON Arguments for the script.
   * @returns {String} Execution result.
   */
  _runDynamicScript(skillName, scriptName, argsJSON) {
    const scriptContent = this._readSkillResource(skillName, scriptName);
    if (scriptContent.startsWith("[Error]")) return scriptContent;
    try {
      const parsedArgs =
        typeof argsJSON === "string" ? JSON.parse(argsJSON) : argsJSON;
      const executableFunc = new Function("args", scriptContent);
      return executableFunc(parsedArgs);
    } catch (e) {
      return `Script Execution Error: ${e.message}`;
    }
  }

  /**
   * ### Description
   * Delegate a sub-task to a specialized subagent.
   * This creates a new independent Executor (GeminiWithFiles instance) internally.
   *
   * @private
   * @param {String} agentName Name of the subagent skill.
   * @param {String} prompt Prompt for the subagent.
   * @returns {String} Execution result from the subagent.
   */
  _invokeAgent(agentName, prompt) {
    const skills = this._discoverSkills();
    const subSkill = skills[agentName];
    if (!subSkill) return `[Error] Subagent skill '${agentName}' not found.`;

    try {
      // Isolate context by giving it ONLY its specific subagent instructions
      // The constructor will automatically append the list of all skills so the subagent can further self-delegate
      const subagentSystemInstruction = `[SUBAGENT ROLE: ${agentName}]\nInstructions for this role:\n${subSkill.instructions}\n\n`;

      const options = {
        model: this.model, // Fixed: Pass model string exactly as-is to preserve API requirement.
        version: this.version,
        systemInstruction: subagentSystemInstruction,
        skillFolderId: this.skillFolderId,
        propertiesService: this.propertiesService,
        temperature: this.temperature,
        generationConfig: this.generationConfig,
      };

      if (this.queryParameters.key) options.apiKey = this.queryParameters.key;
      if (this.accessToken && !this.queryParameters.key)
        options.accessToken = this.accessToken;

      const subagent = new GeminiWithFiles(options);

      console.log(`[Agent Orchestration] Invoking Subagent: ${agentName}...`);
      const res = subagent.generateContent({ q: prompt });
      console.log(
        `[Agent Orchestration] Subagent ${agentName} execution finished.`,
      );

      return typeof res === "string" ? res : JSON.stringify(res);
    } catch (e) {
      return `[Error] Subagent execution failed: ${e.message}`;
    }
  }

  /**
   * ### Description
   * Parse SKILL.md content to extract frontmatter and body text.
   *
   * @private
   * @param {String} content Content of SKILL.md.
   * @returns {Object} Parsed metadata.
   */
  _parseSkillMd(content) {
    const normalized = content.replace(/\r\n/g, "\n");
    const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return null;

    const yaml = match[1];
    const nameMatch = yaml.match(/name:\s*(.+)/);
    const descMatch = yaml.match(/description:\s*(.+)/);

    return {
      name: nameMatch ? nameMatch[1].trim() : "unknown",
      description: descMatch ? descMatch[1].trim() : "",
      instructions: match[2].trim(),
    };
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
    if (!url) return "";
    const params = Object.entries(obj)
      .flatMap(([k, v]) =>
        Array.isArray(v)
          ? v.map((e) => `${k}=${encodeURIComponent(e)}`)
          : `${k}=${encodeURIComponent(v)}`,
      )
      .join("&");
    return params ? `${url}?${params}` : url;
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
    if (checkError && res.getResponseCode() !== 200) {
      throw new Error(res.getContentText());
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
    class UploadApp {
      constructor(object = {}) {
        this.property = object.propertiesService;
        if (object.resumableUploadAsNewUpload) {
          const tempProp = this.property.getKeys().includes("next");
          if (tempProp) this.property.deleteProperty("next");
        }

        const next = this.property.getProperty("next");
        if (
          !next &&
          (!object.source || (!object.source.fileId && !object.source.url))
        ) {
          throw new Error("Please set a valid object.");
        } else if (next) {
          this.tempObject = JSON.parse(next);
          this.current = this.tempObject.next;
          this.tempObject.next = 0;
          if (this.tempObject.result) delete this.tempObject.result;
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

      run() {
        if (this.current === 0) {
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

      getMetadata_() {
        if (this.googleDrive) {
          const res = UrlFetchApp.fetch(
            `${this.fileGet}&fields=mimeType%2Csize`,
            { headers: { authorization: this.authorization } },
          );
          const obj = JSON.parse(res.getContentText());
          if (obj.mimeType.includes("application/vnd.google-apps")) {
            throw new Error(
              "This script cannot be used to the files related to Google. For example, Google Doc, Google Sheet, and so on.",
            );
          }
          this.tempObject.orgObject.source.mimeType = obj.mimeType;
          this.tempObject.orgObject.source.size = obj.size;
          return;
        }

        const res = UrlFetchApp.fetch(this.downloadUrl, {
          muteHttpExceptions: true,
          headers: { Range: "bytes=0-1" },
        });
        if (res.getResponseCode() !== 206)
          throw new Error("This file cannot be done the resumable download.");

        const headers = res.getHeaders();
        const range = headers["Content-Range"].split("\/");
        const match = headers["Content-Disposition"]?.match(
          /filename=\"([a-zA-Z0-9\s\S].+)\";/,
        );
        this.tempObject.orgObject.source.fileName = match
          ? match[1].trim()
          : this.startTime.toString();
        this.tempObject.orgObject.source.mimeType =
          headers["Content-Type"].split(";")[0];
        this.tempObject.orgObject.source.size = Number(range[1]);
      }

      getChunks_() {
        const size = this.tempObject.orgObject.source.size;
        const count = Math.ceil(size / this.chunkSize);
        this.tempObject.chunks = Array.from({ length: count }, (_, i) => [
          i * this.chunkSize,
          i === count - 1 ? size - 1 : (i + 1) * this.chunkSize - 1,
        ]);
      }

      getLocation_() {
        const options = {
          payload: JSON.stringify(
            this.tempObject.orgObject.destination.metadata,
          ),
          contentType: "application/json",
          muteHttpExceptions: true,
        };
        const q = this.parseQueryParameters_(
          this.tempObject.orgObject.destination.uploadUrl,
        );
        if (!q.queryParameters.uploadType) {
          throw new Error(
            "Please confirm whether your endpoint can be used for the resumable upload. And, please include uploadType=resumable in uploadUrl.",
          );
        }
        if (!q.queryParameters.key)
          options.headers = { authorization: this.authorization };

        const res = UrlFetchApp.fetch(
          this.tempObject.orgObject.destination.uploadUrl,
          options,
        );
        if (res.getResponseCode() !== 200)
          throw new Error(res.getContentText());
        this.tempObject.location = res.getAllHeaders()["Location"];
      }

      downloadAndUpload_() {
        const len = this.tempObject.chunks.length;
        for (let i = this.current; i < len; i++) {
          const e = this.tempObject.chunks[i];
          const currentBytes = `${e[0]}-${e[1]}`;
          console.log(`Now... ${i + 1}/${len}`);

          const params1 = {
            headers: { range: `bytes=${currentBytes}` },
            muteHttpExceptions: true,
          };
          if (this.googleDrive)
            params1.headers.authorization = this.authorization;

          console.log(`Start downloading data with ${currentBytes}`);
          let res1 = UrlFetchApp.fetch(this.downloadUrl, params1).getContent();
          console.log(`Finished downloading data with ${currentBytes}`);

          const params2 = {
            headers: {
              "Content-Range": `bytes ${currentBytes}/${this.tempObject.orgObject.source.size}`,
            },
            payload: res1,
            muteHttpExceptions: true,
          };

          console.log(`Start uploading data with ${currentBytes}`);
          const res2 = UrlFetchApp.fetch(this.tempObject.location, params2);
          console.log(`Finished uploading data with ${currentBytes}`);

          const statusCode = res2.getResponseCode();
          if (statusCode === 200) {
            console.log("Done.");
            this.tempObject.result = JSON.parse(res2.getContentText());
          } else if (statusCode === 308) {
            console.log("Upload the next chunk.");
            res1 = [];
          } else {
            throw new Error(res2.getContentText());
          }

          if (Date.now() - this.startTime > this.limitProcessTime) {
            this.tempObject.next = i + 1;
            this.property.setProperty("next", JSON.stringify(this.tempObject));
            break;
          }
        }

        if (this.tempObject.next > 0 && !this.tempObject.result) {
          const message =
            "There is the next upload chunk. So, please run the script again.";
          console.warn(message);
          this.tempObject.result = { message };
        } else {
          this.property.deleteProperty("next");
        }
      }

      parseQueryParameters_(url) {
        if (typeof url !== "string")
          throw new Error(
            "Please give URL (String) including the query parameters.",
          );
        const s = url.split("?");
        if (s.length === 1) return { url: s[0], queryParameters: null };
        const [baseUrl, query] = s;
        if (query) {
          const queryParameters = query.split("&").reduce((o, e) => {
            const temp = e.split("=");
            const key = temp[0].trim();
            const valueStr = temp[1].trim();
            const value = isNaN(valueStr) ? valueStr : Number(valueStr);
            if (o[key]) o[key].push(value);
            else o[key] = [value];
            return o;
          }, {});
          return { url: baseUrl, queryParameters };
        }
        return null;
      }
    }

    const { url, fileId } = object;
    const displayName = url
      ? `url@${url}$page@1$maxPage@1`
      : `fileId@${fileId}$page@1$maxPage@1`;
    const obj = {
      destination: {
        uploadUrl: `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${this.queryParameters.key}`,
        metadata: { file: { displayName } },
      },
      accessToken: this.accessToken,
      resumableUploadAsNewUpload: this.resumableUploadAsNewUpload,
    };
    if (url) obj.source = { url };
    else if (fileId) obj.source = { fileId };
    else throw new Error("No URL or file ID.");

    if (this.propertiesService) obj.propertiesService = this.propertiesService;
    else
      throw new Error(
        `Please set "PropertiesService.getScriptProperties()" as "propertiesService".`,
      );

    const { file } = new UploadApp(obj).run();
    return file;
  }
}
