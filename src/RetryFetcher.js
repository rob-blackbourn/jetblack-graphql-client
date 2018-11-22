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

export default function graphQLRetryFetch (url, query, variables = {}, operationName = null, headers = {}, method = 'post') {
  return retryFetch(
    url,
    {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables,
        operationName
      })
    })
}
