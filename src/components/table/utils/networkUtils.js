export const chunkBatchPayloads = (create = [], update = [], del = [], chunkSize = 100) => {
    const max = Math.max(create.length, update.length, del.length);
    const batches = [];

    for (let i = 0; i < max; i += chunkSize) {
      batches.push({
        create: create.slice(i, i + chunkSize),
        update: update.slice(i, i + chunkSize),
        delete: del.slice(i, i + chunkSize),
      });
    }

    return batches;
  };