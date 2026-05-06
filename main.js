/**
 * GitHub  https://github.com/tanaikech/GeminiWithFiles<br>
 * Library name
 * @type {string}
 * @const {string}
 * @readonly
 */
var appName = "GeminiWithFiles";

/**
 * Private instance to hold the initialized class object.
 * This prevents global namespace pollution and avoids "this" context issues in GAS libraries.
 * @private
 */
var _instance = null;

/**
 * Main Class
 *
 * ### Usage
 * ```
 * {Object} object API key or access token for using Gemini API.
 * {String} object.apiKey API key.
 * {String} object.accessToken Access token.
 * {String} object.model Model. Default is "models/gemini-3-flash-preview".
 * {String} object.version Version of API. Default is "v1beta".
 * {Boolean} object.doCountToken Default is false. If this is true, when Gemini API is requested, the token of request is shown in the log.
 * {Array} object.history History for continuing chat.
 * {Array} object.functions If you want to give the custom functions, please use this.
 * {String} object.response_mime_type In the current stage, "text/plain", "application/json", and "text/x.enum" can be used.
 * {String} object.responseMimeType In the current stage, "text/plain", "application/json", and "text/x.enum" can be used.
 * {Object} object.response_schema JSON schema for controlling the output format. For OpenAPI schema.
 * {Object} object.responseSchema JSON schema for controlling the output format.
 * {Object} object.response_json_schema JSON schema for controlling the output format. For JSON Schema.
 * {Object} object.responseJsonSchema JSON schema for controlling the output format.
 * {Number} object.temperature Control the randomness of the output.
 * {Object} object.systemInstruction System instruction for the model.
 * {Boolean} object.exportTotalTokens When this is true, the total tokens are exported as the result value.
 * {Boolean} object.exportRawData Returns the raw data returned from Gemini API.
 * {Object} object.toolConfig If you want to directly give the object of "toolConfig", please use this.
 * {Array} object.tools For example, when you want to use "codeExecution", please set `tools: [{ codeExecution: {}}]`.
 * {PropertiesService.Properties} object.propertiesService PropertiesService.getScriptProperties()
 * {Boolean} object.resumableUploadAsNewUpload Upload the data with the resumable upload as new upload.
 * {Object} object.generationConfig GenerationConfig properties.
 * {String} object.skillFolderId Folder ID on Google Drive for Agent Skills.
 * ```
 *
 * @param {Object} object API key or access token and configuration options.
 * @returns {GeminiWithFiles} Returns the initialized GeminiWithFiles instance.
 */
function geminiWithFiles(object) {
  _instance = new GeminiWithFiles(object);
  return _instance;
}

/**
 * ### Description
 * Set file IDs.
 *
 * @param {Array} fileIds File IDs on Google Drive for uploading to Gemini.
 * @param {Boolean}[asImage=false] Default is false. If this is true, all files are used as the thumbnail images.
 * @returns {GeminiWithFiles} Returns the GeminiWithFiles instance.
 */
function setFileIds(fileIds, asImage = false) {
  if (!_instance)
    throw new Error(
      "GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.",
    );
  _instance.setFileIds(fileIds, asImage);
  return _instance;
}

/**
 * ### Description
 * Set blobs.
 *
 * @param {Blob[]} blobs Blobs for uploading to Gemini.
 * @param {Boolean} [pdfAsImage=false] Default is false. If this is true, when the blob is PDF data, each page is converted to image data.
 * @returns {GeminiWithFiles} Returns the GeminiWithFiles instance.
 */
function setBlobs(blobs, pdfAsImage = false) {
  if (!_instance)
    throw new Error(
      "GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.",
    );
  _instance.setBlobs(blobs, pdfAsImage);
  return _instance;
}

/**
 * ### Description
 * Upload data (files) to Gemini with resumable upload.
 * In this case, you can use the file ID on Google Drive and the URL of the direct link of the file.
 *
 * @param {Array} array Array including the file IDs or URLs for uploading to Gemini.
 * @returns {GeminiWithFiles} Returns the GeminiWithFiles instance.
 */
function setFileIdsOrUrlsWithResumableUpload(array) {
  if (!_instance)
    throw new Error(
      "GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.",
    );
  _instance.setFileIdsOrUrlsWithResumableUpload(array);
  return _instance;
}

/**
 * ### Description
 * Create object for using the generateContent method.
 *
 * @param {Array} [fileList=[]] File list from the uploadFiles and getFileList method.
 * @returns {GeminiWithFiles} Returns the GeminiWithFiles instance.
 */
function withUploadedFilesByGenerateContent(fileList = []) {
  if (!_instance)
    throw new Error(
      "GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.",
    );
  _instance.withUploadedFilesByGenerateContent(fileList);
  return _instance;
}

/**
 * ### Description
 * Upload files to Gemini.
 *
 * @param {Number}[n=50] Number of concurrent upload to Gemini. Default value is 50.
 * @returns {Object|Array} Returned object or array of uploaded files from Gemini.
 */
function uploadFiles(n = 50) {
  if (!_instance)
    throw new Error(
      "GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.",
    );
  return _instance.uploadFiles(n);
}

/**
 * ### Description
 * Get file list in Gemini.
 *
 * @returns {Array} File list.
 */
function getFileList() {
  if (!_instance)
    throw new Error(
      "GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.",
    );
  return _instance.getFileList();
}

/**
 * ### Description
 * Delete files from Gemini.
 *
 * @param {Array} names Array including names of the files on Gemini.
 * @param {Number} [n=50] Number of concurrent delete files. Default value is 50.
 * @returns {Array} Array including response values. When the delete is successed, no response is returned.
 */
function deleteFiles(names, n = 50) {
  if (!_instance)
    throw new Error(
      "GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.",
    );
  return _instance.deleteFiles(names, n);
}

/**
 * ### Description
 * Main method. Generate content using Gemini API.
 *
 * @param {Object} object Object containing request parameters for Gemini API.
 * @param {String} [object.q] Input text.
 * @returns {(String|Number|Array|Object|Boolean)} Output value.
 */
function generateContent(object) {
  if (!_instance)
    throw new Error(
      "GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.",
    );
  return _instance.generateContent(object);
}

/**
 * Development suspended on 20250722
 * ref: https://issuetracker.google.com/issues/431365432
 */
// /**
//  * ### Description
//  * This method is used for generating content by the batch requests.
//  * ref: https://ai.google.dev/gemini-api/docs/batch-mode
//  *
//  * @param {Object} object Object for generating content by the batch requests.
//  * @return {Object} Response value as an object.
//  */
// function batchGenerateContent(object) {
//   if (!_instance) throw new Error("GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.");
//   return _instance.batchGenerateContent(object);
// }

/**
 * ### Description
 * Method for generating content with the chat.
 *
 * @param {Object} object Object for chat with Gemini API.
 * @param {Object} [options={}] Optional parameters for chat behavior.
 * @returns {Object} Output value.
 */
function chat(object, options) {
  if (!_instance)
    throw new Error(
      "GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.",
    );
  return _instance.chat(object, options);
}

/**
 * ### Description
 * Method for counting tokens of the request.
 *
 * @param {Object} object Object for chat with Gemini API.
 * @returns {Object} Output value containing token count details.
 */
function countTokens(object) {
  if (!_instance)
    throw new Error(
      "GeminiWithFiles is not initialized. Please call geminiWithFiles(object) first.",
    );
  return _instance.countTokens(object);
}
