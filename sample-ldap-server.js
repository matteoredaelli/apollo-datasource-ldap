const { ApolloServer, gql } = require("apollo-server");

const {
  LdapDataSource,
  resolvers,
  typeDefs,
} = require("./index.js");

const ldap_config = require("./ldap.json");

var ldapDS = {};

Object.keys(ldap_config).map(function (key, index) {
  ldapDS[key] = new LdapDataSource(
    key,
    ldap_config[key].user,
    ldap_config[key].password,
    ldap_config[key].basedn,
    ldap_config[key].options
  );
});

const graphqlSchemaObj = {
  typeDefs: typeDefs,
  resolvers: resolvers,
  tracing: true,
  dataSources: () => ldapDS,
  plugins: [],
  cacheControl: {
    defaultMaxAge: 3600, // 3600 seconds
  },
};

const server = new ApolloServer(graphqlSchemaObj);

// The `listen` method launches a web server.
server.listen({ port: process.env.PORT }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
