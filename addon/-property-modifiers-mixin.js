import Ember from 'ember';
import Scheduler from './-scheduler';
import {
  enqueueTasksPolicy,
  enqueueWithPriorityPolicy,
  dropQueuedTasksPolicy,
  cancelOngoingTasksPolicy,
  dropButKeepLatestPolicy
} from './-buffer-policy';

export const propertyModifiers = {
  // by default, task(...) expands to task(...).enqueue().maxConcurrency(Infinity)
  _bufferPolicy: enqueueTasksPolicy,
  _maxConcurrency: Infinity,
  _taskGroupPath: null,
  _hasUsedModifier: false,
  _hasSetBufferPolicy: false,

  restartable() {
    return setBufferPolicy(this, cancelOngoingTasksPolicy);
  },

  enqueue() {
    return setBufferPolicy(this, enqueueTasksPolicy);
  },

  enqueueWithPriority(sortFunc) {
    return setBufferPolicy(this, Object.assign({ sortFunc }, enqueueWithPriorityPolicy));
  },

  drop() {
    return setBufferPolicy(this, dropQueuedTasksPolicy);
  },

  keepLatest() {
    return setBufferPolicy(this, dropButKeepLatestPolicy);
  },

  maxConcurrency(n) {
    this._hasUsedModifier = true;
    this._maxConcurrency = n;
    assertModifiersNotMixedWithGroup(this);
    return this;
  },

  group(taskGroupPath) {
    this._taskGroupPath = taskGroupPath;
    assertModifiersNotMixedWithGroup(this);
    return this;
  },

  debug() {
    this._debug = true;
    return this;
  }
};

function setBufferPolicy(obj, policy) {
  obj._hasSetBufferPolicy = true;
  obj._hasUsedModifier = true;
  obj._bufferPolicy = policy;
  assertModifiersNotMixedWithGroup(obj);

  if (obj._maxConcurrency === Infinity) {
    obj._maxConcurrency = 1;
  }

  return obj;
}

function assertModifiersNotMixedWithGroup(obj) {
  Ember.assert(`ember-concurrency does not currently support using both .group() with other task modifiers (e.g. drop(), enqueue(), restartable())`, !obj._hasUsedModifier || !obj._taskGroupPath);
}

export function resolveScheduler(propertyObj, obj, TaskGroup) {
  if (propertyObj._taskGroupPath) {
    let taskGroup = obj.get(propertyObj._taskGroupPath);
    Ember.assert(`Expected path '${propertyObj._taskGroupPath}' to resolve to a TaskGroup object, but instead was ${taskGroup}`, taskGroup instanceof TaskGroup);
    return taskGroup._scheduler;
  } else {
    return Scheduler.create({
      bufferPolicy: propertyObj._bufferPolicy,
      maxConcurrency: propertyObj._maxConcurrency
    });
  }
}

