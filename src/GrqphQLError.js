export default class GraphQLError extends Error {
  constructor (details, ...params) {
    super(...params)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GraphQLError)
    }

    this.details = details
  }
}
