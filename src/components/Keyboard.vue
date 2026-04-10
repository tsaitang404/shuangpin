<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { ref, onActivated, onDeactivated } from "vue";
import { useStore } from "../store";
import { mapConfigToLayout } from "../utils/keyboard";

const store = useStore();
const settings = storeToRefs(store).settings;

const props = defineProps<{
  hints?: string[];
  validSeq?: (_: [string?, string?]) => boolean;
  onKeyClick?: (key: string) => void;
}>();

const pressingKeys = ref(new Set<string>());
const keySeq = ref<string[]>([]);
const scale = ref(1);

const onPressKey = (e: KeyboardEvent) => {
  if (e.key === " ") e.preventDefault();
  pressKey(e.key);
};
const onReleaseKey = (e: KeyboardEvent) => releaseKey(e.key);

onActivated(() => {
  document.addEventListener("keydown", onPressKey);
  document.addEventListener("keyup", onReleaseKey);
  window.addEventListener("resize", resizeKeyboard);
  resizeKeyboard();
});

onDeactivated(() => {
  document.removeEventListener("keydown", onPressKey);
  document.removeEventListener("keyup", onReleaseKey);
  window.removeEventListener("resize", resizeKeyboard);
});

function resizeKeyboard() {
  const screenWidth = document.getElementById("app")?.clientWidth ?? 920;
  const keyboardWidth = document.getElementById("keyboard")?.clientWidth ?? 920;
  scale.value = screenWidth < 576 ? (screenWidth / keyboardWidth) * 1.1 : 1;
}

const shiftLocked = ref(false);

function pressKey(key: string) {
  pressingKeys.value.add(key);
  navigator.vibrate(100);
}

function clickShift() {
  navigator.vibrate(100);
  if (shiftLocked.value) {
    shiftLocked.value = false;
    pressingKeys.value.delete("Shift");
  } else {
    shiftLocked.value = true;
    pressingKeys.value.add("Shift");
  }
}

function send() {
  if (props.validSeq?.([keySeq.value.at(0), keySeq.value.at(1)])) {
    keySeq.value = [];
  }
}

function releaseKey(key: string, shouldSend = true) {
  if (key === "Shift") {
    // 物理键盘 Shift 松开时，仅在未锁定时移除
    if (!shiftLocked.value) pressingKeys.value.delete("Shift");
    return;
  }

  pressingKeys.value.delete(key);
  const unlockShift = shiftLocked.value;

  if (key === "Backspace") {
    keySeq.value.pop();
    send();
    if (unlockShift) { shiftLocked.value = false; pressingKeys.value.delete("Shift"); }
    return;
  }

  if (!shouldSend || !store.mode().groupByKey.has(key as Char)) {
    if (shouldSend) {
      const effectiveKey = shiftLocked.value && shiftMap[key] !== undefined ? shiftMap[key] : key;
      props.onKeyClick?.(effectiveKey);
    }
    if (unlockShift) { shiftLocked.value = false; pressingKeys.value.delete("Shift"); }
    return;
  }

  if (keySeq.value.length <= 2) {
    keySeq.value.push(key);
  }

  if (keySeq.value.length > 2) {
    if (settings.value.enableAutoClear) {
      keySeq.value = [key];
    } else {
      keySeq.value.pop();
    }
  }

  send();
  if (unlockShift) { shiftLocked.value = false; pressingKeys.value.delete("Shift"); }
}

const keyLayout = computed(() => mapConfigToLayout(store.mode()));

const spMap = computed(() => {
  const m = new Map<string, { lead: string; follow: string }>();
  for (const row of keyLayout.value) {
    for (const item of row) {
      m.set(item.main, { lead: item.lead, follow: item.follow });
    }
  }
  return m;
});

const shiftMap: Record<string, string> = {
  "`": "~", "1": "!", "2": "@", "3": "#", "4": "$",
  "5": "%", "6": "^", "7": "&", "8": "*", "9": "(",
  "0": ")", "-": "_", "=": "+",
  "[": "{", "]": "}", "\\": "|",
  ";": ":", "'": '"',
  ",": "<", ".": ">", "/": "?",
};

const shiftSymbols = new Set(Object.values(shiftMap));

function needsShift(hints: string[] | undefined): boolean {
  return !!hints?.some(h => shiftSymbols.has(h));
}

function keyItemClass(key: string) {
  const cls: string[] = [];
  if (pressingKeys.value.has(key)) cls.push("pressing");
  const isShiftKey = key === "Shift";
  const hinted = isShiftKey
    ? needsShift(props.hints)
    : props.hints?.includes(key) || (shiftMap[key] !== undefined && props.hints?.includes(shiftMap[key]));
  if (hinted && settings.value.enableKeyHint) cls.push("hint-key");
  return cls.join(" ");
}

const numRowKeys = ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];
const qRowLetters = "qwertyuiop".split("");
const qRowExtra = ["[", "]", "\\"];
const aRowLetters = "asdfghjkl;".split("");
const zRowLetters = "zxcvbnm".split("");
const zRowExtra = [",", ".", "/"];

</script>

<template>
  <div class="keyboard" :style="`transform: scale(${scale})`" id="keyboard">
    <!-- Number row -->
    <div class="key-row">
      <div
        v-for="k in numRowKeys" :key="k"
        class="key-item sym-key"
        :class="keyItemClass(k)"
        @mousedown="pressKey(k)"
        @touchstart.stop.prevent="pressKey(k)"
        @mouseup="releaseKey(k)"
        @mouseout="releaseKey(k, false)"
        @touchend.stop.prevent="releaseKey(k)"
      >
        <span class="shift-char">{{ shiftMap[k] ?? '' }}</span>
        <span class="base-char">{{ k }}</span>
      </div>
      <div
        class="key-item special-key backspace"
        :class="keyItemClass('Backspace')"
        @mousedown="pressKey('Backspace')"
        @touchstart.stop.prevent="pressKey('Backspace')"
        @mouseup="releaseKey('Backspace')"
        @mouseout="releaseKey('Backspace', false)"
        @touchend.stop.prevent="releaseKey('Backspace')"
      >&#x232B;</div>
    </div>

    <!-- Q row -->
    <div class="key-row">
      <div
        class="key-item special-key tab-key"
        :class="keyItemClass('Tab')"
        @mousedown="pressKey('Tab')"
        @touchstart.stop.prevent="pressKey('Tab')"
        @mouseup="releaseKey('Tab')"
        @mouseout="releaseKey('Tab', false)"
        @touchend.stop.prevent="releaseKey('Tab')"
      >Tab</div>
      <div
        v-for="k in qRowLetters" :key="k"
        class="key-item letter-key"
        :class="keyItemClass(k)"
        @mousedown="pressKey(k)"
        @touchstart.stop.prevent="pressKey(k)"
        @mouseup="releaseKey(k)"
        @mouseout="releaseKey(k, false)"
        @touchend.stop.prevent="releaseKey(k)"
      >
        <div class="main-content">
          <div class="main-key">{{ k.toUpperCase() }}</div>
          <div v-if="spMap.get(k)?.lead" class="lead-key">{{ spMap.get(k)?.lead }}</div>
        </div>
        <div class="bottom-content">
          <div class="follow-key">{{ spMap.get(k)?.follow }}</div>
        </div>
      </div>
      <div
        v-for="k in qRowExtra" :key="k"
        class="key-item sym-key"
        :class="keyItemClass(k)"
        @mousedown="pressKey(k)"
        @touchstart.stop.prevent="pressKey(k)"
        @mouseup="releaseKey(k)"
        @mouseout="releaseKey(k, false)"
        @touchend.stop.prevent="releaseKey(k)"
      >
        <span class="shift-char">{{ shiftMap[k] ?? '' }}</span>
        <span class="base-char">{{ k }}</span>
      </div>
    </div>

    <!-- A row -->
    <div class="key-row">
      <div
        class="key-item special-key caps-key"
        :class="keyItemClass('CapsLock')"
        @mousedown="pressKey('CapsLock')"
        @touchstart.stop.prevent="pressKey('CapsLock')"
        @mouseup="releaseKey('CapsLock')"
        @mouseout="releaseKey('CapsLock', false)"
        @touchend.stop.prevent="releaseKey('CapsLock')"
      >Caps</div>
      <div
        v-for="k in aRowLetters" :key="k"
        class="key-item"
        :class="[/^[a-z]$/.test(k) ? 'letter-key' : 'sym-key', keyItemClass(k)]"
        @mousedown="pressKey(k)"
        @touchstart.stop.prevent="pressKey(k)"
        @mouseup="releaseKey(k)"
        @mouseout="releaseKey(k, false)"
        @touchend.stop.prevent="releaseKey(k)"
      >
        <template v-if="/^[a-z]$/.test(k)">
          <div class="main-content">
            <div class="main-key">{{ k.toUpperCase() }}</div>
            <div v-if="spMap.get(k)?.lead" class="lead-key">{{ spMap.get(k)?.lead }}</div>
          </div>
          <div class="bottom-content">
            <div class="follow-key">{{ spMap.get(k)?.follow }}</div>
          </div>
        </template>
        <template v-else>
          <span class="shift-char">{{ shiftMap[k] ?? '' }}</span>
          <span class="base-char">{{ k }}</span>
        </template>
      </div>
      <div
        class="key-item sym-key"
        :class="keyItemClass(`'`)"
        @mousedown="pressKey(`'`)"
        @touchstart.stop.prevent="pressKey(`'`)"
        @mouseup="releaseKey(`'`)"
        @mouseout="releaseKey(`'`, false)"
        @touchend.stop.prevent="releaseKey(`'`)"
      >
        <span class="shift-char">{{ shiftMap["'"] }}</span>
        <span class="base-char">'</span>
      </div>
      <div
        class="key-item special-key enter-key"
        :class="keyItemClass('Enter')"
        @mousedown="pressKey('Enter')"
        @touchstart.stop.prevent="pressKey('Enter')"
        @mouseup="releaseKey('Enter')"
        @mouseout="releaseKey('Enter', false)"
        @touchend.stop.prevent="releaseKey('Enter')"
      >Enter</div>
    </div>

    <!-- Z row -->
    <div class="key-row">
      <div
        class="key-item special-key shift-key"
        :class="keyItemClass('Shift')"
        @mousedown.prevent="clickShift()"
        @touchstart.stop.prevent="clickShift()"
      >Shift</div>
      <div
        v-for="k in zRowLetters" :key="k"
        class="key-item letter-key"
        :class="keyItemClass(k)"
        @mousedown="pressKey(k)"
        @touchstart.stop.prevent="pressKey(k)"
        @mouseup="releaseKey(k)"
        @mouseout="releaseKey(k, false)"
        @touchend.stop.prevent="releaseKey(k)"
      >
        <div class="main-content">
          <div class="main-key">{{ k.toUpperCase() }}</div>
          <div v-if="spMap.get(k)?.lead" class="lead-key">{{ spMap.get(k)?.lead }}</div>
        </div>
        <div class="bottom-content">
          <div class="follow-key">{{ spMap.get(k)?.follow }}</div>
        </div>
      </div>
      <div
        v-for="k in zRowExtra" :key="k"
        class="key-item sym-key"
        :class="keyItemClass(k)"
        @mousedown="pressKey(k)"
        @touchstart.stop.prevent="pressKey(k)"
        @mouseup="releaseKey(k)"
        @mouseout="releaseKey(k, false)"
        @touchend.stop.prevent="releaseKey(k)"
      >
        <span class="shift-char">{{ shiftMap[k] ?? '' }}</span>
        <span class="base-char">{{ k }}</span>
      </div>
      <div
        class="key-item special-key shift-key shift-right"
        :class="keyItemClass('Shift')"
        @mousedown.prevent="clickShift()"
        @touchstart.stop.prevent="clickShift()"
      >Shift</div>
    </div>

    <!-- Space row -->
    <div class="key-row">
      <div
        class="key-item special-key space-key"
        :class="keyItemClass(' ')"
        @mousedown="pressKey(' ')"
        @touchstart.stop.prevent="pressKey(' ')"
        @mouseup="releaseKey(' ')"
        @mouseout="releaseKey(' ', false)"
        @touchend.stop.prevent="releaseKey(' ')"
      >Space</div>
    </div>
  </div>
</template>

<style lang="less">
@import "../styles/color.less";
@import "../styles/keyboard.less";
</style>
