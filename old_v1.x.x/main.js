/**
 * GitHub  https://github.com/tanaikech/GeminiWithFiles<br>
 * Library name
 * @type {string}
 * @const {string}
 * @readonly
 */
var appName = "GeminiWithFiles";

/**
 * Main Class
 * 
 * ### Usage 
 * ```
 * {Object} object API key or access token for using Gemini API.
 * {String} object.apiKey API key.
 * {String} object.accessToken Access token.
 * {String} object.model Model. Default is "models/gemini-1.5-pro-latest".
 * {String} object.version Version of API. Default is "v1beta".
 * {Boolean} object.doCountToken Default is false. If this is true, when Gemini API is requested, the token of request is shown in the log.
 * {Array} object.history History for continuing chat.
 * {Array} object.functions If you want to give the custom functions, please use this.
 * ```
 * 
 * @param {Object} object API key or access token for using Gemini API.
 * @returns {GeminiWithFiles}
 */
function geminiWithFiles(object) {
  this.geminiWithFiles = new GeminiWithFiles(object);
  return this.geminiWithFiles;
}

/**
 * ### Description
 * Set file IDs.
 *
 * @param {Array} fileIds File IDs on Google Drive for uploading to Gemini.
 * @param {Boolean} asImage Default is false. If this is true, all files are used as the thumbnail images.
 * @returns {GeminiWithFiles}.
 */
function setFileIds(fileIds, asImage = false) {
  this.geminiWithFiles.setFileIds(fileIds, asImage);
  return this.geminiWithFiles;
}

/**
 * ### Description
 * Set blobs.
 *
 * @param {Blob[]} blobs Blobs for uploading to Gemini.
 * @param {Boolean} pdfAsImage Default is false. If this is true, when the blob is PDF data, each page is converted to image data.
 * @returns {GeminiWithFiles}.
 */
function setBlobs(blobs, pdfAsImage = false) {
  this.geminiWithFiles.setBlobs(blobs, pdfAsImage);
  return this.geminiWithFiles;
}

/**
 * ### Description
 * Create object for using the generateContent method.
 * 
 * @param {Array} fileList File list from the uploadFiles and getFileList method.
 * @returns {GeminiWithFiles}
 */
function withUploadedFilesByGenerateContent(fileList = []) {
  this.geminiWithFiles.withUploadedFilesByGenerateContent(fileList);
  return this.geminiWithFiles;
}


/**
 * ### Description
 * Upload files to Gemini.
 *
 * @param {Number} n Number of concurrent upload to Gemini. Default value is 50.
 * @returns {Object} Returned object from Gemini.
 */
async function uploadFiles(n = 50) {
  return await this.geminiWithFiles.uploadFiles(n);
}

/**
 * ### Description
 * Get file list in Gemini.
 * 
 * @returns {Array} File list.
 */
function getFileList() {
  return this.geminiWithFiles.getFileList();
}

/**
 * ### Description
 * Delete files from Gemini.
 *
 * @param {Array} names Array including names of the files on Gemini.
 * @param {Number} n Number of concurrent delete files. Default value is 50.
 * @returns {Array} Array including response values. When the delete is successed, no response is returned.
 */
function deleteFiles(names, n = 50) {
  return this.geminiWithFiles.deleteFiles(names, n);
}

/**
 * ### Description
 * Main method.
 *
 * @param {Object} object Object using Gemini API.
 * @param {String} object.q Input text.
 * @returns {(String|Number|Array|Object|Boolean)} Output value.
 */
function generateContent(object) {
  return this.geminiWithFiles.generateContent(object);
}
