<script setup lang="ts">
const props = defineProps({
  fileMap: { type: Object, default: {} },
  disabled: { type: Boolean, default: false }
})
const selectedKey = defineModel('selectedKey', { default: {} })
const totalFileCount = computed(() => Object.keys(props.fileMap).length)
const selectedFileCount = computed(
  () => Object.keys(selectedKey.value).filter((n) => !/\/$/.test(n)).length
)
const totalSize = computed(() => {
  let size = 0

  Object.keys(selectedKey.value)
    .filter((n) => !/\/$/.test(n))
    .forEach((n) => {
      size += props.fileMap[n].size
    })
  return size
})

function dealNodes(folder: any) {
  const lst = []
  for (let val of Object.values<any>(folder)) {
    lst.push(val)
    if (val.children) {
      val.children = dealNodes(val.children)
    }
  }
  return lst
}

function calcTreeNodes() {
  const root: any = {}

  for (let key in props.fileMap) {
    let curPath = root
    const file = props.fileMap[key]
    let paths = file['paths']
    for (let i = 0; i < paths.length; i++) {
      const name = paths[i]
      if (i === paths.length - 1) {
        curPath[name] = {
          key: key,
          label: name,
          data: file.size
        }
      } else {
        let folder = curPath[name]
        if (!folder) {
          folder = curPath[name] = {
            key: name + '/',
            label: name + '/',
            data: -1,
            children: {}
          }
        }
        curPath = folder.children
      }
    }
  }

  // console.log(root)

  const tmpNodes = dealNodes(root)

  // console.log(tmpNodes)

  return tmpNodes
}

const nodes = computed(calcTreeNodes)
</script>

<template>
  <div class="relative">
    <div v-show="disabled" class="absolute top-0 left-0 right-0 bottom-0 bg-transparent z-50"></div>
    <Tree
      v-model:selectionKeys="selectedKey"
      :value="nodes"
      selectionMode="checkbox"
      :filter="true"
      filterMode="strict"
      class="w-full"
    >
      <template #togglericon="{ expanded }"
        ><Icon :name="expanded ? 'solar:folder-open-linear' : 'solar:add-folder-linear'"
      /></template>
      <template #nodeicon="item"
        ><Icon v-if="!item.node.children" :name="'solar:file-linear'" class="mr-1 shrink-0"
      /></template>
      <template #default="item" class="flex flex-row">
        <span class="break-all">{{ item.node.label }}</span>
        <span v-if="item.node.data != -1" class="ml-1">{{ humanFileSize(item.node.data) }}</span>
      </template>
    </Tree>
    <p class="text-right">
      {{ selectedFileCount }} / {{ totalFileCount }} - {{ humanFileSize(totalSize) }}
    </p>
  </div>
</template>
