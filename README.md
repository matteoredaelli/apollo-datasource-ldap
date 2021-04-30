# apollo-datasource-ldap
LDAP datasource for apollo graphql server

## Sample server

```javascript
const { ApolloServer, gql } = require("apollo-server");

const {
  LdapDataSource,
  resolvers,
  typeDefs,
} = require("apollo-datasource-ldap");

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
  plugins: [responseCachePlugin()],
  cacheControl: {
	defaultMaxAge: 3600, // 3600 seconds
  },
};

const server = new ApolloServer(graphqlSchemaObj);

// The `listen` method launches a web server.
server.listen({ port: process.env.PORT }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
```

ldap.json

```json
{
  "ldap_xxx": {
	"user": "xxx\\matteo",
	"password": "mySillyPassword",
	"basedn": "DC=xxx,DC=redaelli,DC=org",
	"options": {
	  "url": ["ldap://domaincontroller.xxx.redaelli.org:389"],
	  "reconnect": true
	}
  }
}
```

Sample queries

```graphql
{
  ldap_search(
	ldap_id: "ldap_xxx"
	basedn: "dc=xxx,dc=redaelli,dc=org"
	filter: "(samaccountname=server1)"
  ) {
	... on LdapComputer {
		sAMAccountName
		dNSHostName
		ipaddress
	}
  }
}
```

```graphql
{
  ldap_search_computer(
	ldap_id: "ldap_xxx"
	basedn: "dc=xxx,dc=redaelli,dc=org"
	filter: "(samaccountname=server1)"
  ) {
	  sAMAccountName
	  dNSHostName
	  ipaddress
  }
}
```

```graphql
{
  ldap_search_group(
	ldap_id: "ldap_xxx"
	basedn: "dc=xxx,dc=redaelli,dc=org"
	filter: "(samaccountname=qliksense_plant1)"
  ) {
	dn

	memberExt {
	  ... on LdapUser {
		mail
	  }
	  ... on LdapGroup {
		dn
	  }
	}
  }
}
```
```graphql
{
  ldap_search_group(
	ldap_id: "ldap_xxx"
	basedn: "dc=xxx,dc=redaelli,dc=org"
	filter: "(samaccountname=qliksense_plant1)"
  ){
  dn
  pwdLastSetExt
  managerExt {
	mail
  }
}}
```
