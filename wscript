#
# This file is modified from the default set of rules to compile a Pebble
# application.
#
# It includes a DEMO env var directive for compiling the watchface with a static
# set of demo data.
#
import os.path
import json
import subprocess

top = '.'
out = 'build'


def options(ctx):
	ctx.load('pebble_sdk')


def configure(ctx):
	"""
	This method is used to configure your build. ctx.load(`pebble_sdk`) automatically configures
	a build for each valid platform in `targetPlatforms`. Platform-specific configuration: add your
	change after calling ctx.load('pebble_sdk') and make sure to set the correct environment first.
	Universal configuration: add your change prior to calling ctx.load('pebble_sdk').
	"""
	ctx.load('pebble_sdk')

	# Generate compile_commands.json for clangd
	# https://github.com/coredevices/pebble-tool/issues/6#issuecomment-4501068925
	ctx.load('clang_compilation_database', tooldir='./tools')


def build(ctx):
	ctx.load('pebble_sdk')

	# Generate .buildinfo.json from git state and package.json
	def git(*args):
		try:
			return subprocess.check_output(
				['git'] + list(args),
				cwd=ctx.path.abspath(),
				stderr=subprocess.DEVNULL
			).decode().strip()
		except Exception:
			return None

	import datetime
	pkg = json.loads(ctx.path.find_node('package.json').read())
	ctx.path.make_node('.buildinfo.json').write(
		json.dumps({
			'version':   pkg['version'],
			'hash':      git('rev-parse', '--short', 'HEAD') or 'unknown',
			'branch':    git('rev-parse', '--abbrev-ref', 'HEAD') or 'unknown',
			'dirty':     bool(git('status', '--porcelain')),
			'buildDate': datetime.datetime.now(datetime.timezone.utc).isoformat(),
		}, indent=2) + '\n'
	)

	build_worker = os.path.exists('worker_src')
	binaries = []

	cached_env = ctx.env
	demo_scenario = os.environ.get('DEMO', '')
	for platform in ctx.env.TARGET_PLATFORMS:
		ctx.env = ctx.all_envs[platform]
		ctx.set_group(ctx.env.PLATFORM_NAME)
		if demo_scenario:
			ctx.env.append_value('CFLAGS', ['-DDEMO_SCENARIO=' + demo_scenario])
		app_elf = '{}/pebble-app.elf'.format(ctx.env.BUILD_DIR)
		ctx.pbl_build(source=ctx.path.ant_glob('src/c/**/*.c'), target=app_elf, bin_type='app')

		if build_worker:
			worker_elf = '{}/pebble-worker.elf'.format(ctx.env.BUILD_DIR)
			binaries.append({'platform': platform, 'app_elf': app_elf, 'worker_elf': worker_elf})
			ctx.pbl_build(source=ctx.path.ant_glob('worker_src/c/**/*.c'),
			              target=worker_elf,
			              bin_type='worker')
		else:
			binaries.append({'platform': platform, 'app_elf': app_elf})
	ctx.env = cached_env

	ctx.set_group('bundle')
	ctx.pbl_bundle(binaries=binaries,
	               js=ctx.path.ant_glob(['src/pkjs/**/*.js',
	                                     'src/pkjs/**/*.json',
	                                     'src/common/**/*.js']),
	               js_entry_file='src/pkjs/index.js')
