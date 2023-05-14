const core = require('@actions/core');
const github = require('@actions/github');
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

try {
  var version = core.getInput('refname');
  const reftype = core.getInput('reftype');
  const tomls = core.getInput('tomls');
  if (reftype == 'tag') {
  console.log(`Validating version ${version} from tag`);
      validateSemver(version);
  } else {
      if (tomls.length > 0) {
          version = readVersion(tomls[0]);
      }
  }
  tomls.forEach(function(f) {
      console.log(`Validating ${f}`);
      var tversion = readversion(f);
      console.log(`Validating version ${tversion} in ${f}`);
      validateSemver(tversion);
      if (tversion != version) {
          core.setFailed(`Version ${tversion} in ${f} is different than ${version}`);
      }
  });
} catch (error) {
  core.setFailed(error.message);
}
