const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const toml = require('@iarna/toml');
const fs = require('fs');

function validateSemver(version) {
    const re = new RegExp("(0|[1-9]\d*)+\.(0|[1-9]\d*)+\.(0|[1-9]\d*)+(-(([a-z-][\da-z-]+|[\da-z-]+[a-z-][\da-z-]*|0|[1-9]\d*)(\.([a-z-][\da-z-]+|[\da-z-]+[a-z-][\da-z-]*|0|[1-9]\d*))*))?(\\+([\da-z-]+(\.[\da-z-]+)*))?$");
    if (re.exec(version) == null) {
        core.setFailed(`Invalid version ${version}`);
    }
}

function readVersion(file) {
    const fields = ['package', 'version'];
    var str = fs.readFileSync(file);
    var parsed = toml.parse(str);
    var value = parsed;
    fields.forEach(function (f) {
        value = value[f];
    });
    return value;
}

async function main() {
  var version = core.getInput('refname');
  const reftype = core.getInput('reftype');
  const patterns = core.getMultilineInput('tomls').join('\n');
  const globber = await glob.create(patterns, {followSymbolicLinks: false});
  const unsorted = await globber.glob();
  // If refname is 'branch', then the first toml is taken as a reference.
  // Therefore we sort by path length, so that the toplevel toml comes first.
  const tomls = unsorted.toSorted((a, b) => a.split(/[/\\]/).length - b.split(/[/\\]/).length);

  if (reftype == 'tag') {
      console.log(`Validating version ${version} from tag`);
      validateSemver(version);
  } else {
      if (tomls.length > 0) {
          const f = tomls[0];
          const tmp = readVersion(f);
          if (typeof tmp == 'string') {
              version = tmp;
          } else {
              core.setFailed(`Version in ${f} is not a string`);
          }
      }
  }
  tomls.forEach(function(f) {
      console.log(`Validating ${f}`);
      const tversion = readVersion(f);
      // If version is a object and has a boolean member 'workspace' set to true
      // and the file is not in the toplevel dir
      if (typeof tversion  == 'object') {
          if (Object.hasOwn(tversion, 'workspace')) {
              if (tversion['workspace'] === true) {
                  if (f.split(/[/\\]/).length > 1) {
                      console.log(`Version in ${f} refers to toplevel version`);
                      return;
                  }
              }
          }
          core.setFailed(`Version in ${f} is not a string`);
      }
      console.log(`Validating version ${tversion} in ${f}`);
      validateSemver(tversion);
      if (tversion != version) {
          core.setFailed(`Version ${tversion} in ${f} is different than ${version}`);
      }
  });
}

try {
    main();
} catch (error) {
  core.setFailed(error.message);
}
