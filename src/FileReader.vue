<template>
  <label class="file-reader">
    <input type="file" @change="loadDataFromFile">
  </label>
</template>

<script>
export default {
  methods: {
    loadDataFromFile(ev) {

        console.log (ev);

        const reader = new FileReader();
        const fileName = ev.target.files[0].name;
    
        const songName = fileName.split(".")[0] !== "mod" ? fileName.split(".")[0] : fileName.split(".")[1];
    
        reader.onload = e => {
            this.$emit("loaded", { 'songName': songName, 'data': e.target.result });
        }
        
        reader.readAsArrayBuffer(ev.target.files[0]);
    }
  }
};
</script>