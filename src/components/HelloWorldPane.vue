<template>
  <div class="hello-pane">
    <h2 class="hello-pane__title">Hello World</h2>
    <p class="hello-pane__body">
      This is a sample pane. Use the drag handle to move it and resize the panel corners to explore the workspace layout.
    </p>
    <v-btn color="primary" variant="flat">Action</v-btn>
  </div>
</template>

<style scoped>
.hello-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hello-pane__title {
  margin: 0;
  font-size: 1.5rem;
}

.hello-pane__body {
  margin: 0;
  color: rgba(0, 0, 0, 0.7);
}
</style>
