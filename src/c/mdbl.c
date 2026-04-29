#include <pebble.h>

// XS virtual machine heap configuration.
// Defaults are slot=8192, chunk=8192, stack=6144 bytes.
//
// The XSA archive load phase initializes all prelinked module namespaces
// simultaneously before any JS runs.  With ~153 modules (SDK + app) each
// requiring namespace-binding slots, the burst is large:
//
//   Observed (instruments just before crash, slot=32768):
//     Slot used:  16384 B  →  GC ran  →  available: 9024 B  →  still failed
//     GC count:   8192      ←  GC thrashed trying to free space
//     Modules:    153
//
// Also note: modules/icons does `export * from "./icons/library"` which
// registers 63 named bindings (62 codepoints + IconLabel) in the icons
// module namespace alone.
//
// 4096 slots × 16 B = 65536 B.  emery heap ~192 KB; pools total ~88 KB,
// leaving ~104 KB free for Pebble OS and Piu rendering.
#define CARBON_SLOT_SIZE  65536   // 4096 slots × 16 bytes
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
