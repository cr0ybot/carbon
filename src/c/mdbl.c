#include <pebble.h>

// XS virtual machine heap configuration.
// Defaults are slot=8192, chunk=8192, stack=6144 bytes.
// The XSA archive load phase initializes all prelinked module namespaces
// simultaneously, requiring a burst well above the steady-state baseline.
// System reports ~57KB free after these allocations (emery has ~192KB heap).
#define CARBON_SLOT_SIZE  32768   // 2048 slots × 16 bytes — room for module init burst
#define CARBON_CHUNK_SIZE 16384
#define CARBON_STACK_SIZE 8192

int main(void) {
	Window *w = window_create();
	window_stack_push(w, true);

	ModdableCreationRecord creation = {
		.recordSize = sizeof(ModdableCreationRecord),
		.slot  = CARBON_SLOT_SIZE,
		.chunk = CARBON_CHUNK_SIZE,
		.stack = CARBON_STACK_SIZE,
#ifdef ALLOY_INSTRUMENTATION
		.flags = kModdableCreationFlagLogInstrumentation,
#endif
	};
	moddable_createMachine(&creation);

	window_destroy(w);
}
