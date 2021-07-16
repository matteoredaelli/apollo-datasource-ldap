/**
 * Copyright (c) 2021 Matteo Redaelli
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const { gql } = require("apollo-server");
const { DataSource } = require("apollo-datasource");
const ldap = require("ldapjs-promise");
const util = require("util");
const dns = require("dns");

var tls = require("tls");

function filetime2date(ldaptime) {
  if (ldaptime) {
    const unixTime = ldaptime / 10000000 - 11644473600;
    const mydate = new Date(Math.round(unixTime * 1000));
    return mydate.toISOString();
  } else {
    return null;
  }
}

function filetimeDaysFromNow(ldaptime) {
  if (ldaptime) {
    const unixTime = ldaptime / 10000000 - 11644473600;
    const now = new Date();
    const mydate = new Date(Math.round(unixTime * 1000));
    const days = Math.floor((now - mydate) / 86400000);
    return days;
  } else {
    return null;
  }
}

function accountExpires(value) {
  if (value == "0" || value == "9223372036854775807") return false;
  else return true;
}

async function getIP(host) {
  const lookup = util.promisify(dns.lookup);
  try {
    result = lookup(host);
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
}

class LdapDataSource extends DataSource {
  constructor(id, user, password, basedn, options) {
    super();
    this.ldap_id = id;
    this.user = user;
    this.password = password;
    this.basedn = basedn;
    this.options = options;
    this.client = ldap.createClient(options);
    console.log(this.client);
    this.bind();
  }

  initialize(config) {
    this.context = config.context;
  }

  bind() {
    this.client.bind(this.user, this.password);
  }

  unbind() {
    this.client.unbind();
  }

  async search(basedn, opts, client = false) {
    console.log("basedn: ", basedn);
    console.log("opts: ", opts);
    const ldap_id = this.ldap_id;

    let client_new = client;

    if (!client) {
      client_new = this.client;
      client_new.bind(this.user, this.password);
    }
    const result = await this.client.searchReturnAll(basedn, opts);
    console.log("result: ", result);
    if (!client) {
      client_new.unbind();
    }
    if ("entries" in result) {
      return result["entries"].map((v) => ({ ...v, ldap_id: ldap_id }));
    } else {
      return result;
    }
  }
  async search_by_dn(basedn, dn) {
    const opts = { filter: `(distinguishedName=${dn})`, scope: "sub" };
    //console.log("opts :", opts);
    const resp = await this.search(basedn, opts);
    console.log(resp);
    return Array.isArray(resp) && resp.length > 0 ? resp[0] : {};
  }
  async search_flat_member_by_dn(basedn, dn) {
    const opts = {
      filter: `(member:1.2.840.113556.1.4.1941:=${dn})`,
      scope: "sub",
    };
    //console.log("opts :", opts);
    const resp = await this.search(basedn, opts);
    console.log(resp);
    return resp;
  }
  async search_flat_member_of_by_dn(basedn, dn) {
    const opts = {
      filter: `(memberOf:1.2.840.113556.1.4.1941:=${dn})`,
      scope: "sub",
    };
    //console.log("opts :", opts);
    const resp = await this.search(basedn, opts);
    console.log(resp);
    return resp;
  }
}

const typeDefs = gql`
  type LdapComputer {
    dn: ID!
    ldap_id: String
    ipaddress: String
    cn: String
    distinguishedName: String
    instanceType: Int
    whenCreated: String
    whenChanged: String
    uSNCreated: Int
    uSNChanged: Int
    name: String
    objectGUID: String
    userAccountControl: Int
    codePage: Int
    countryCode: Int
    lastLogon: String
    localPolicyFlags: Int
    pwdLastSet: String
    primaryGroupID: Int
    objectSid: String
    accountExpires: String
    accountExpiresExt: Boolean
    logonCount: Int
    sAMAccountName: String!
    sAMAccountType: Int
    operatingSystem: String
    operatingSystemVersion: String
    dNSHostName: String
    objectCategory: String
    isCriticalSystemObject: Boolean
    lastLogonTimestamp: String
    msDSSupportedEncryptionTypes: Int
    msDSGenerationId: String
    msDFSRComputerReferenceBL: [String]
    dSCorePropagationData: [String]
    servicePrincipalName: [String]
    rIDSetReferences: [String]
    serverReferenceBL: [String]
    userCertificate: [String]
    description: [String]
    objectClass: [String]
  }

  union LdapObject = LdapGroup | LdapUser | LdapComputer

  type LdapGroup {
    dn: ID!
    ldap_id: String
    memberExt: [LdapObject]
    flat_member: [String]
    flat_memberOf: [String]
    cn: String
    distinguishedName: String
    instanceType: Int
    whenCreated: String
    whenChanged: String
    uSNCreated: Int
    uSNChanged: Int
    name: String
    objectGUID: String
    objectSid: String
    sAMAccountName: String
    sAMAccountType: Int
    groupType: Int
    objectCategory: String
    dSCorePropagationData: [String]
    memberOf: [String]
    member: [String]
    description: [String]
    objectClass: [String]
  }

  type LdapUser {
    dn: ID!
    ldap_id: String
    directReportsExt: [LdapUser]
    memberOfExt: [LdapGroup]
    lastLogonTimestampExt: String
    locked: Boolean
    cn: String
    sn: String
    c: String
    l: String
    postalCode: String
    telephoneNumber: String
    givenName: String
    distinguishedName: String
    instanceType: Int
    whenCreated: String
    whenChanged: String
    displayName: String
    uSNCreated: Int
    uSNChanged: Int
    co: String
    company: String
    streetAddress: String
    targetAddress: String
    extensionAttribute2: String
    extensionAttribute6: String
    extensionAttribute7: String
    extensionAttribute9: String
    extensionAttribute10: String
    mailNickname: String
    extensionAttribute12: String
    name: String
    objectGUID: String
    userAccountControl: Int
    badPwdCount: Int
    codePage: Int
    countryCode: Int
    badPasswordTime: String
    pwdLastSet: String
    pwdLastSetExt: String
    pwdLastSetDays: Int
    primaryGroupID: Int
    objectSid: String
    accountExpires: String
    accountExpiresExt: Boolean
    sAMAccountName: String
    sAMAccountType: Int
    legacyExchangeDN: String
    userPrincipalName: String
    lockoutTime: String
    objectCategory: String
    lastLogonTimestamp: String
    msDSExternalDirectoryObjectId: String
    textEncodedORAddress: String
    mail: String
    manager: String
    managerExt: LdapUser
    mobile: String
    msExchUserAccountControl: Int
    msExchMailboxGuid: String
    msRTCSIPUserEnabled: Boolean
    msExchAuditDelegateAdmin: Int
    msExchArchiveGUID: String
    msRTCSIPPrimaryHomeServer: String
    msExchAuditOwner: Int
    msExchRemoteRecipientType: Int
    msExchELCMailboxFlags: Int
    msExchMailboxAuditEnable: Boolean
    msRTCSIPFederationEnabled: Boolean
    msExchRecipientTypeDetails: Int
    msExchAuditAdmin: Int
    msExchArchiveStatus: Int
    msExchRecipientDisplayType: Int
    msRTCSIPOptionFlags: Int
    msRTCSIPPrimaryUserAddress: String
    msExchUsageLocation: String
    msExchMailboxAuditLogAgeLimit: Int
    msExchWhenMailboxCreated: String
    msExchOWAPolicy: String
    msRTCSIPInternetAccessEnabled: Boolean
    msExchSafeSendersHash: String
    msRTCSIPDeploymentLocator: String
    msExchMobileMailboxFlags: Int
    msExchVersion: Int
    msExchAuditDelegate: Int
    msExchMailboxTemplateLink: String
    msExchTextMessagingState: [Int]
    msExchUMDtmfMap: [String]
    msRTCSIPUserPolicies: [String]
    msExchUserHoldPolicies: [String]
    msExchArchiveName: [String]
    msExchPoliciesExcluded: [String]
    dSCorePropagationData: [String]
    showInAddressBook: [String]
    protocolSettings: [String]
    directReports: [String]
    proxyAddresses: [String]
    memberOf: [String]
    objectClass: [String]
  }

  type Query {
    ldap_search(
      ldap_id: String!
      basedn: String!
      filter: String!
      scope: String = "sub"
      attributes: [String]
    ): [LdapObject]
    ldap_search_computer(
      ldap_id: String!
      basedn: String!
      filter: String!
      scope: String = "sub"
      attributes: [String]
    ): [LdapComputer]
    ldap_search_group(
      ldap_id: String!
      basedn: String!
      filter: String!
      scope: String = "sub"
      attributes: [String]
    ): [LdapGroup]
    ldap_search_user(
      ldap_id: String!
      basedn: String!
      filter: String!
      scope: String = "sub"
      attributes: [String]
    ): [LdapUser]
  }
`;

const resolvers = {
  LdapObject: {
    __resolveType(obj, context, info) {
      if (obj && obj.objectClass.includes("computer")) {
	return "LdapComputer";
      }
      if (obj && obj.objectClass.includes("group")) {
	return "LdapGroup";
      }
      if (obj && obj.objectClass.includes("user")) {
	return "LdapUser";
      }
      return null; // GraphQLError is thrown
    },
  },
  LdapComputer: {
    accountExpiresExt: async (computer, _args, _) => {
      return accountExpires(computer.accountExpires);
    },
    ipaddress: async (computer, _args, { dataSources }) => {
      if (computer && computer.dNSHostName) {
	try {
	  const ipaddress = await getIP(computer.dNSHostName);
	  return ipaddress ? ipaddress.address : null;
	} catch (err) {
	  console.log(err);
	  return null;
	}
      } else return null;
    },
  },
  LdapGroup: {
    memberExt: async (group, _args, { dataSources }) => {
      const ds = dataSources[group.ldap_id];
      const basedn = ds.basedn;
      const details = await Promise.all(
	group.member.map((g) => ds.search_by_dn(basedn, g))
      );
      return details;
    },
    flat_member: async (user, _args, { dataSources }) => {
      const ds = dataSources[user.ldap_id];
      const basedn = ds.basedn;
      return Array.isArray(user.member) && user.member.length > 0
	? await ds.search_flat_member_by_dn(basedn, user.dn)
	: [];
    },
    flat_memberOf: async (user, _args, { dataSources }) => {
      const ds = dataSources[user.ldap_id];
      const basedn = ds.basedn;
      return Array.isArray(user.member) && user.member.length > 0
	? await ds.search_flat_member_of_by_dn(basedn, user.dn)
	: [];
    },
  },
  LdapUser: {
    accountExpiresExt: async (user, _args, _) => {
      return accountExpires(user.accountExpires);
    },
    directReportsExt: async (user, _args, { dataSources }) => {
      const ds = dataSources[user.ldap_id];
      const basedn = ds.basedn;
      const details = await Promise.all(
	user.directReports.map((g) => ds.search_by_dn(basedn, g))
      );
      return details;
    },
    locked: async (user, _args, _) => {
      return user.lockoutTime && parseInt(user.lockoutTime) > 0;
    },
    pwdLastSetExt: async (user, _args, _) => {
      return filetime2date(user.pwdLastSet);
    },
    pwdLastSetDays: async (user, _args, _) => {
      return filetimeDaysFromNow(user.pwdLastSet);
    },
    lastLogonTimestampExt: async (user, _args, _) => {
      return filetime2date(user.lastLogonTimestamp);
    },
    managerExt: async (user, _args, { dataSources }) => {
      const ds = dataSources[user.ldap_id];
      const basedn = ds.basedn;
      const details = user.manager
	? await ds.search_by_dn(basedn, user.manager)
	: null;
      return details; //.filter(function (u) {
      //return u.distinguishedName ? true : false;
      //});
    },
    memberOfExt: async (user, _args, { dataSources }) => {
      const ds = dataSources[user.ldap_id];
      const basedn = ds.basedn;
      const details = await Promise.all(
	user.memberOf.map((g) => ds.search_by_dn(basedn, g))
      );
      return details;
    },
  },
  Query: {
    ldap_search: async (
      _parent,
      { ldap_id, basedn, filter, scope, attributes },
      { dataSources }
    ) => {
      //console.log(dataSources[id]);
      const opts = {
	filter: filter,
	scope: scope,
	attributes: attributes,
      };
      try {
	const resp = await dataSources[ldap_id].search(basedn, opts);
	console.log(resp);
	return resp;
      } catch (err) {
	console.log(err);
      }
    },
    // search computer
    ldap_search_computer: async (
      _parent,
      { ldap_id, basedn, filter, scope, attributes },
      { dataSources }
    ) => {
      const opts = {
	filter: filter,
	scope: scope,
	attributes: attributes,
      };
      try {
	const resp = await dataSources[ldap_id].search(basedn, opts);
	return resp;
      } catch (err) {
	console.log(err);
      }
    },
    // search group
    ldap_search_group: async (
      _parent,
      { ldap_id, basedn, filter, scope, attributes },
      { dataSources }
    ) => {
      //console.log(dataSources[id]);
      const opts = {
	filter: filter,
	scope: scope,
	attributes: attributes,
      };
      try {
	const resp = await dataSources[ldap_id].search(basedn, opts);
	return resp;
      } catch (err) {
	console.log(err);
      }
    },
    // search user
    ldap_search_user: async (
      _parent,
      { ldap_id, basedn, filter, scope, attributes },
      { dataSources }
    ) => {
      const opts = {
	filter: filter,
	scope: scope,
	attributes: attributes,
      };
      try {
	const resp = await dataSources[ldap_id].search(basedn, opts);
	return resp;
      } catch (err) {
	console.log(err);
      }
    },
  }, // query
};

module.exports = { LdapDataSource, resolvers, typeDefs };
