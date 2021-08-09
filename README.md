A page for testing custom clearkey key systems.

The use case for this is that some browsers will expose clearkey systems with different functionality behind a different key system name. So instead of requesting `org.w3c.clearkey` a page can request access to `com.company.custom_clearkey` to get a key system that behaves like clearkey but with adjusted functionality.

This functionality can be used for testing browsers and can include things like firing extra session messages to verify internal state.