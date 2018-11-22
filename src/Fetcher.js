export default function graphQLFetch (url, query, variables = {}, operationName = null, headers = {}, method = 'post') {
  return fetch(
    url,
    {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables,
        operationName
      })
    }
  )
}
