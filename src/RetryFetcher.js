function retryFetch (url, options, delay = 1000, maxRetries = 0, retryOn = [503]) {
  return new Promise((resolve, reject) => {
    const fetchProxy = retryCount => {
      fetch(url, options)
        .then((response) => {
          if (response.status < 400) {
            resolve(response)
          } else if (retryOn.includes(response.status) && (maxRetries === 0 || retryCount < maxRetries)) {
            retry(retryCount)
          } else {
            resolve(response)
          }
        })
        .catch(error => {
          if (maxRetries > 0 && retryCount < maxRetries) {
            retry(retryCount)
          } else {
            reject(error)
          }
        })
    }

    function retry (retryCount) {
      setTimeout(() => fetchProxy(++retryCount), delay)
    }

    fetchProxy(0)
  })
}

export default class RetryFetcher {
  constructor (url, headers = {}, method = null, delay = 1000, maxRetries = 0, retryOn = [503]) {
    this.url = url
    this.headers = headers
    this.method = method
    this.delay = delay
    this.maxRetries = maxRetries
    this.retryOn = retryOn
  }

  fetch (query, variables = {}, operationName = null, headers = {}, method = null, delay = null, maxRetries = null, retryOn = null) {
    return retryFetch(this.url, {
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
    },
    delay || this.delay,
    maxRetries || this.maxRetries,
    retryOn || this.retryOn)
      .then(response => response.json())
  }
}
