#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const kexec = require('kexec');
const Mustache = require('mustache');

const renderLdif = (config) => {
  const dir = path.join(__dirname, 'templates');
  const partials = fs.readdirSync(dir).reduce((hash, file) => {
    const name = file.split('.')[0];
    hash[name] = fs.readFileSync(path.join(dir, file), 'utf8');
    return hash;
  }, {});

  const view = JSON.parse(fs.readFileSync(config, 'utf8'));
  view.groups = view.users.reduce((groups, user) => {
    user.groups.forEach(name => {
      const group = groups.find(g => g.name === name);
      if (!group) {
        groups.push({ name, members: [user.username] });
      } else {
        group.members.push(user.username);
      }
    });
    return groups;
  }, []);

  return Mustache.render(partials.ldif, view, partials);
}

const contents = renderLdif(process.argv[2]);
const ldif = tmp.tmpNameSync();
fs.writeFileSync(ldif, contents, 'utf8');
kexec('java', ['-jar', path.join(__dirname, 'ldap-server.jar'), ldif]);
