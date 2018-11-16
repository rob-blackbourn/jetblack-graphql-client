module.exports = {
  options: {
    output: "lib"
  },
  use: [
    "@neutrinojs/standardjs",
    [
      "@neutrinojs/library",
      {
        name: "jetblack-graphql-client",
        target: "web"
      }
    ]
  ]
};
