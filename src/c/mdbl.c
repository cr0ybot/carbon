#include <pebble.h>

// XS virtual machine heap pools.
//
// Think of these as three separate memory buckets the JavaScript engine draws
// from. You tell it exactly how large each bucket is before it starts. Sizes
// are in bytes; they come out of the Pebble app heap (~131 KB on emery).
//
// CARBON_SLOT_SIZE — "the object graph bucket"
//   Every JS variable binding, object property, and module namespace entry
//   costs one slot (16 bytes). All module namespaces are wired up before
//   main.js ever runs, so startup burns a large burst of slots.
//   Symptom when too small: `fxAbort memory full` immediately on launch,
//   often before any of your own code runs. Can also appear as
//   `fxMapArchive failed` if the pool is so small the archive can't even
//   be loaded.
//   Symptom when too large: same crash — if this bucket + the others
//   together exceed the Pebble heap, the OS itself runs out of memory.
//
// CARBON_CHUNK_SIZE — "the string/array/bytecode bucket"
//   Variable-size allocations live here: string content, array storage,
//   object literals, and the bytecode for every module. Style and Skin
//   objects (created with `new Style(...)` / `new Skin(...)` at module
//   load time) also consume chunk space. If many modules each create their
//   own copy of the same Style, chunk pressure adds up fast.
//   Symptom when too small: `fxAbort memory full` after the mod loads
//   ("Found mod" appears in the log) but before or during your app's
//   module-initialization phase.
//
// CARBON_STACK_SIZE — "the call-stack bucket"
//   Each function call frame is allocated here. Deep call chains (e.g.
//   recursive Piu template evaluation) can exhaust this.
//   Symptom when too small: `fxAbort stack overflow`.
//
// Rule of thumb: slot + chunk + stack should stay under ~55 KB so that
// Pebble OS + Piu rendering retain enough heap to operate. The emery
// platform reports ~131 KB app heap; ~75 KB is a safe upper bound for
// total VM pool usage.
//
// To diagnose: enable ALLOY_INSTRUMENTATION (`npm run build:dev`) and look
// for the "instruments key" log lines. They report "Slot used", "Chunk used",
// "Stack used", and "System bytes free" every second. If any "used" value
// is close to its pool size when the crash occurs, that pool is the culprit.
#define CARBON_SLOT_SIZE  37888 //40960
#define CARBON_CHUNK_SIZE 21504 //18432
#define CARBON_STACK_SIZE 4096 //6144

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
