export default class Fetcher {
  constructor (url, headers = {}, method = null) {
    this.url = url
    this.headers = headers
    this.method = method
  }

  fetch (query, variables = {}, operationName = null, headers = {}, method = null) {
    return fetch(this.url, {
      method: method || this.method || 'post',
      headers: {
        ...this.headers,
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables,
        operationName
      })
    })
      .then(response => response.json())
  }
}
