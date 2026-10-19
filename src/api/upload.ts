import { apiUrl } from "@/api/client"

/**
 * POSTs a multipart body to the API with credentials and reports the upload progress (fetch cannot). Resolves with a
 * Response built from the answer, so callers read errors the same way as after fetch; a network failure rejects with
 * a TypeError, like fetch.
 */
export function uploadWithProgress(path: string, body: FormData, onProgress: (percent: number) => void): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("POST", apiUrl(path))
    request.withCredentials = true
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    }
    request.onerror = () => reject(new TypeError("Failed to fetch"))
    request.onload = () => {
      const headers = new Headers()
      for (const line of request.getAllResponseHeaders().trim().split(/[\r\n]+/)) {
        const at = line.indexOf(":")
        if (at > 0) headers.append(line.slice(0, at).trim(), line.slice(at + 1).trim())
      }
      // a Response cannot carry a body for 204/304 or a status outside 200–599
      const status = request.status >= 200 && request.status <= 599 ? request.status : 500
      resolve(new Response(status === 204 || status === 304 ? null : request.responseText, { status, headers }))
    }
    request.send(body)
  })
}
