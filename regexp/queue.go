package regexp

type FixedSizeQueue[T any] struct {
	data     []T
	capacity int
	head     int // Index of the oldest element
	tail     int // Index where the next element will be added
	size     int // Number of elements in the queue
}

func NewFixedSizeQueue[T any](capacity int) *FixedSizeQueue[T] {
	return &FixedSizeQueue[T]{
		data:     make([]T, capacity),
		capacity: capacity,
		head:     0,
		tail:     0,
		size:     0,
	}
}

func (q *FixedSizeQueue[T]) Enqueue(item T) {
	if q.capacity == 0 {
		return
	} else if q.size == q.capacity {
		// Queue is full, overwrite the oldest element
		q.data[q.tail] = item
		q.tail = (q.tail + 1) % q.capacity
		q.head = (q.head + 1) % q.capacity
	} else {
		q.data[q.tail] = item
		q.tail = (q.tail + 1) % q.capacity
		q.size++
	}
}

func (q *FixedSizeQueue[T]) Dequeue() T {
	if q.size == 0 {
		var zero T // Zero value for the type T
		return zero
	}

	item := q.data[q.head]
	q.head = (q.head + 1) % q.capacity
	q.size--
	return item
}

func (q *FixedSizeQueue[T]) Size() int {
	return q.size
}
