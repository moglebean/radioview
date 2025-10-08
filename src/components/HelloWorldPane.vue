<template>
  <VueGridStackPane title="Hello World">
    <div class="hello-pane">
      <p class="hello-pane__body">
        This is a sample pane. Use the drag handle to move it and resize the panel corners to explore the workspace layout.
        Now is the time for all good men to come to the aid of their country.
        The quick brown fox jumps over the lazy dog.
        Friends, romans, countrymen, lend me your ears.  I come to bury Caesar, not to praise him.
        This is a sample pane. Use the drag handle to move it and resize the panel corners to explore the workspace layout.
        Now is the time for all good men to come to the aid of their country.
        The quick brown fox jumps over the lazy dog.
        Friends, romans, countrymen, lend me your ears.  I come to bury Caesar, not to praise him.
      </p>
    </div>
      

    <!-- Add the button to the actions slot-->
    <template #actions>
      <v-btn color="primary" variant="flat">Action</v-btn>
    </template>
  </VueGridStackPane>
</template>

<script setup>
import VueGridStackPane from './VueGridStackPane.vue'
</script>

<style scoped>
.hello-pane {
  display: flex;
  flex-direction: column;
}

.hello-pane__body {
  margin: 0;
  color: rgba(0, 0, 0, 0.7);
}
</style>
