export default class EventError extends Error {
  constructor (event, ...params) {
    super(...params)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EventError)
    }

    this.event = event
  }
}
